geotab.addin.reporteKm = () => {
    let listado = [];
    return {
        initialize(api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            const statusBar = document.getElementById("status-bar");
            
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                statusBar.style.display = "block";
                statusBar.innerText = "Consultando flota y datos de tacógrafo...";
                
                const year = document.getElementById("selYear").value;
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";
                listado = [];

                try {
                    // 1. Obtener y ordenar vehículos alfabéticamente
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    for (const dev of devices) {
                        statusBar.innerText = `Analizando: ${dev.name}...`;

                        // BUSCAMOS ODOMETRO INICIAL: El primero disponible A PARTIR del 1 de enero
                        const resIni = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                fromDate: `${year}-01-01T00:00:00Z`
                            }
                        });

                        // BUSCAMOS ODOMETRO FINAL: El último disponible HASTA el 31 de diciembre
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
                            const inicialKM = resIni[0].data / 1000;
                            const finalKM = resFin[0].data / 1000;
                            const totalKM = finalKM - inicialKM;

                            // Solo procesamos si el dato final es posterior o igual al inicial
                            if (totalKM >= 0) {
                                listado.push({
                                    n: dev.name,
                                    m: dev.licensePlate || "-",
                                    i: inicialKM,
                                    f: finalKM,
                                    t: totalKM
                                });
                            }
                        }
                    }
                    renderTabla(listado);
                    statusBar.innerText = `¡Completado! ${listado.length} vehículos procesados.`;
                    btnCsv.style.display = "inline-block";
                } catch (e) {
                    statusBar.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial (km);Odo Final (km);Total Anual (km)\n";
                listado.forEach(r => {
                    csv += `${r.n};${r.m};${r.i.toFixed(2).replace('.',',')};${r.f.toFixed(2).replace('.',',')};${r.t.toFixed(2).replace('.',',')}\n`;
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

function renderTabla(data) {
    const tbody = document.querySelector("#tblData tbody");
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${r.n}</td>
            <td style="font-weight:bold">${r.m}</td>
            <td class="num">${r.i.toLocaleString('es-ES', {minimumFractionDigits: 2})} km</td>
            <td class="num">${r.f.toLocaleString('es-ES', {minimumFractionDigits: 2})} km</td>
            <td class="num total">${r.t.toLocaleString('es-ES', {minimumFractionDigits: 2})} km</td>
        </tr>
    `).join('');
}