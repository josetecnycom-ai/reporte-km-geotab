geotab.addin.reporteKm = () => {
    let listado = [];
    return {
        initialize(api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            const status = document.getElementById("status-bar");
            
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                status.style.display = "block";
                status.innerText = "Procesando flota... por favor espere.";
                
                const year = document.getElementById("selYear").value;
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";
                listado = [];

                try {
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    for (const dev of devices) {
                        // 1. ODOMETRO INICIAL (El primero registrado A PARTIR del 1 de enero)
                        const resIni = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                fromDate: `${year}-01-01T00:00:00Z`
                            }
                        });

                        // 2. ODOMETRO FINAL (El último registrado HASTA el 31 de diciembre)
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
                            // Verificamos que no sea el mismo registro exacto (comparando fecha)
                            if (resIni[0].dateTime !== resFin[0].dateTime) {
                                const inicial = resIni[0].data / 1000;
                                const final = resFin[0].data / 1000;
                                const total = final - inicial;

                                if (total > 0) {
                                    const r = { n: dev.name, m: dev.licensePlate || "-", i: inicial, f: final, t: total };
                                    listado.push(r);
                                    
                                    tbody.innerHTML += `
                                        <tr>
                                            <td class="text-left">${r.n}</td>
                                            <td class="text-left"><strong>${r.m}</strong></td>
                                            <td class="text-right">${r.i.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td class="text-right">${r.f.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td class="text-right highlight">${r.t.toLocaleString('es-ES', {minimumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            }
                        }
                    }
                    status.innerText = `Éxito: ${listado.length} vehículos con movimiento encontrados.`;
                    btnCsv.style.display = (listado.length > 0) ? "inline-block" : "none";
                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial;Odo Final;Total Año\n";
                listado.forEach(r => {
                    csv += `${r.n};${r.m};${r.i.toFixed(1)};${r.f.toFixed(1)};${r.t.toFixed(1)}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Reporte_Gasoleo_${document.getElementById("selYear").value}.csv`;
                link.click();
            });
            callback();
        }
    };
};