geotab.addin.reporteKm = () => {
    let listado = [];
    return {
        initialize(api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            
            btn.addEventListener("click", async () => {
                const year = document.getElementById("selYear").value;
                document.getElementById("status").innerText = "Consultando datos de tacógrafo...";
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";

                try {
                    const devices = await api.call("Get", { typeName: "Device" });
                    listado = [];

                    for (const dev of devices) {
                        const res = await api.call("Get", {
                            typeName: "StatusData",
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                fromDate: `${year}-01-01T00:00:00Z`,
                                toDate: `${year}-12-31T23:59:59Z`
                            }
                        });

                        if (res && res.length > 1) {
                            const inicial = res[0].data / 1000;
                            const final = res[res.length - 1].data / 1000;
                            const total = final - inicial;
                            
                            listado.push({ n: dev.name, m: dev.licensePlate || "-", i: inicial.toFixed(2), f: final.toFixed(2), t: total.toFixed(2) });
                            tbody.innerHTML += `<tr><td>${dev.name}</td><td>${dev.licensePlate || "-"}</td><td>${inicial.toFixed(2)}</td><td>${final.toFixed(2)}</td><td>${total.toFixed(2)}</td></tr>`;
                        }
                    }
                    document.getElementById("status").innerText = "Proceso finalizado.";
                    btnCsv.style.display = "inline-block";
                } catch (e) {
                    document.getElementById("status").innerText = "Error: " + e.message;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "Vehiculo;Matricula;Odo Inicial;Odo Final;Total KM\n";
                listado.forEach(row => { csv += `${row.n};${row.m};${row.i};${row.f};${row.t}\n`; });
                const blob = new Blob([csv], { type: 'text/csv' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "reporte_km.csv";
                link.click();
            });
            callback();
        }
    };
};