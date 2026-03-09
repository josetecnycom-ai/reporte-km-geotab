geotab.addin.reporteKm = () => {
    let listado = [];
    return {
        initialize(api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const year = document.getElementById("selYear").value;
                document.getElementById("status").innerText = "Sincronizando con registros de tacógrafo...";
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";

                try {
                    const devices = await api.call("Get", { typeName: "Device" });
                    listado = [];

                    for (const dev of devices) {
                        // BUSCAMOS EL ODOMETRO INICIAL (El primero del año)
                        const resIni = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                fromDate: `${year}-01-01T00:00:00Z`
                            }
                        });

                        // BUSCAMOS EL ODOMETRO FINAL (El último registrado hasta el 31 de dic)
                        const resFin = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                toDate: `${year}-12-31T23:59:59Z`
                            }
                        });

                        if (resIni.length > 0 && resFin.length > 0) {
                            const inicial = resIni[0].data / 1000;
                            const final = resFin[0].data / 1000;
                            const total = final - inicial;
                            
                            if (total >= 0) {
                                const row = { n: dev.name, m: dev.licensePlate || "-", i: inicial.toLocaleString(), f: final.toLocaleString(), t: total.toLocaleString() };
                                listado.push(row);
                                tbody.innerHTML += `<tr><td>${row.n}</td><td><strong>${row.m}</strong></td><td>${row.i} km</td><td>${row.f} km</td><td class="total-cell">${row.t} km</td></tr>`;
                            }
                        }
                    }
                    document.getElementById("status").innerText = "Reporte generado con éxito.";
                    btnCsv.style.display = "inline-block";
                } catch (e) {
                    document.getElementById("status").innerText = "Error de conexión: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial;Odo Final;Total KM\n";
                listado.forEach(row => { csv += `${row.n};${row.m};${row.i};${row.f};${row.t}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Gasoleo_Profesional_${document.getElementById("selYear").value}.csv`;
                link.click();
            });
            callback();
        }
    };
};