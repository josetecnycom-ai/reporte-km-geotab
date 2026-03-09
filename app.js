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
                statusBar.className = "loading";
                statusBar.innerText = "Iniciando consulta masiva de flota...";
                
                const year = document.getElementById("selYear").value;
                const tbody = document.querySelector("#tblData tbody");
                tbody.innerHTML = "";
                listado = [];

                try {
                    // 1. Obtener todos los vehículos sin filtros iniciales para no perder ninguno
                    const devices = await api.call("Get", { typeName: "Device" });
                    
                    let procesados = 0;

                    for (const dev of devices) {
                        procesados++;
                        statusBar.innerText = `Procesando ${procesados} de ${devices.length} vehículos...`;

                        // BUSCAMOS ODOMETRO INICIAL: El último valor antes del 1 de enero del año seleccionado
                        const resIni = await api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                toDate: `${year}-01-01T00:00:01Z` 
                            }
                        });

                        // BUSCAMOS ODOMETRO FINAL: El último valor antes de que termine el 31 de diciembre
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
                            // Geotab devuelve metros. Convertimos a KM con 2 decimales fijos.
                            const inicialKM = resIni[0].data / 1000;
                            const finalKM = resFin[0].data / 1000;
                            const totalKM = finalKM - inicialKM;

                            // Solo añadimos si hay un movimiento lógico (evitar errores de datos)
                            if (totalKM >= 0) {
                                const fila = {
                                    nombre: dev.name,
                                    matricula: dev.licensePlate || "S/M",
                                    ini: inicialKM.toFixed(2),
                                    fin: finalKM.toFixed(2),
                                    total: totalKM.toFixed(2)
                                };
                                listado.push(fila);
                                
                                tbody.innerHTML += `
                                    <tr>
                                        <td>${fila.nombre}</td>
                                        <td><strong>${fila.matricula}</strong></td>
                                        <td class="km-val">${parseFloat(fila.ini).toLocaleString('es-ES')} km</td>
                                        <td class="km-val">${parseFloat(fila.fin).toLocaleString('es-ES')} km</td>
                                        <td class="km-val total-highlight">${parseFloat(fila.total).toLocaleString('es-ES')} km</td>
                                    </tr>`;
                            }
                        }
                    }
                    
                    statusBar.className = "success";
                    statusBar.innerText = `¡Completado! Se han procesado ${listado.length} vehículos con datos de tacógrafo.`;
                    btnCsv.style.display = "inline-block";
                    
                } catch (e) {
                    statusBar.className = "loading"; // Usar estilo de aviso para el error
                    statusBar.innerText = "Error en la API: " + e.message;
                    console.error(e);
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial (km);Odo Final (km);Total Anual (km)\n";
                listado.forEach(r => {
                    csv += `${r.nombre};${r.matricula};${r.ini.replace('.',',')};${r.fin.replace('.',',')};${r.total.replace('.',',')}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_Tacho_${document.getElementById("selYear").value}.csv`;
                link.click();
            });

            callback();
        }
    };
};