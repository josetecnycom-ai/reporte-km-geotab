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
                status.innerText = "Sincronizando con MyGeotab...";
                
                const year = document.getElementById("selYear").value;
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";
                listado = [];

                try {
                    // 1. Obtener y ordenar vehículos alfabéticamente
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    for (const dev of devices) {
                        status.innerText = `Consultando tacógrafo: ${dev.name}...`;

                        // BUSCAR DATO FINAL (El último del año)
                        const resFin = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                toDate: `${year}-12-31T23:59:59Z`
                            }
                        });

                        // BUSCAR DATO INICIAL (El más cercano al 1 de enero)
                        // Primero intentamos buscar el dato justo antes de empezar el año
                        let resIni = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                toDate: `${year}-01-01T00:00:00Z`
                            }
                        });

                        // Si no hay datos antes de enero (camión nuevo), buscamos el primero DESPUÉS de enero
                        if (resIni.length === 0) {
                            resIni = await api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: {
                                    deviceSearch: { id: dev.id },
                                    diagnosticSearch: { id: "DiagnosticOdometerId" },
                                    fromDate: `${year}-01-01T00:00:00Z`
                                }
                            });
                        }

                        if (resIni.length > 0 && resFin.length > 0) {
                            const inicial = resIni[0].data / 1000;
                            const final = resFin[0].data / 1000;
                            const total = final - inicial;

                            // Filtro de seguridad: Solo mostramos si hay datos coherentes y el camión se ha movido
                            if (total >= 0) {
                                const fila = { n: dev.name, m: dev.licensePlate || "-", i: inicial, f: final, t: total };
                                listado.push(fila);
                                
                                tbody.innerHTML += `
                                    <tr>
                                        <td>${fila.n}</td>
                                        <td><strong>${fila.m}</strong></td>
                                        <td class="num">${fila.i.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                        <td class="num">${fila.f.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                        <td class="num total-col">${fila.t.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                    </tr>`;
                            }
                        }
                    }
                    status.innerText = `Proceso finalizado. ${listado.length} vehículos con datos.`;
                    btnCsv.style.display = "inline-block";
                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial;Odo Final;Total Año\n";
                listado.forEach(r => {
                    csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`;
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