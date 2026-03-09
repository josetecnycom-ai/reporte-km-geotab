geotab.addin.reporteKm = () => {
    let listado = [];
    return {
        initialize(api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            const status = document.getElementById("status-bar");
            const tbody = document.querySelector("#tblData tbody");
            
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                btnCsv.style.display = "none";
                tbody.innerHTML = "";
                status.style.display = "block";
                status.style.color = "#243665";
                // Actualizamos el mensaje de status para saber que es la versión optimizada
                status.innerText = "Iniciando consulta optimizada (v2.1)... por favor espere.";
                
                const year = document.getElementById("selYear").value;
                const diagnosticId = "DiagnosticOdometerId";
                listado = [];

                try {
                    // 1. Obtener lista de vehículos (una sola llamada)
                    status.innerText = "Obteniendo lista de vehículos...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    
                    // Ordenar alfabéticamente
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    if (devices.length === 0) {
                        status.innerText = "No se encontraron vehículos.";
                        return;
                    }

                    status.innerText = `Preparando consultas para ${devices.length} vehículos...`;

                    // 2. Crear las promesas de API para todos los vehículos (OPTIMIZACIÓN CLAVE v2.1)
                    // En lugar de hacer 'await' dentro del bucle, creamos un array de promesas.
                    const promises = devices.map(async (dev) => {
                        // Definimos las dos búsquedas necesarias
                        // ODOMETRO INICIAL: El primero disponible A PARTIR del 1 de enero
                        const callIni = api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: diagnosticId },
                                fromDate: `${year}-01-01T00:00:00Z`
                            }
                        });

                        // ODOMETRO FINAL: El último disponible HASTA el 31 de diciembre
                        const callFin = api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: diagnosticId },
                                toDate: `${year}-12-31T23:59:59Z`
                            }
                        });

                        // Esperamos a que terminen las dos llamadas para este dispositivo específico
                        const [resIni, resFin] = await Promise.all([callIni, callFin]);

                        if (resIni.length > 0 && resFin.length > 0) {
                            // Verificamos que no sea el mismo registro exacto (comparando fecha)
                            if (resIni[0].dateTime !== resFin[0].dateTime) {
                                const inicial = resIni[0].data / 1000;
                                const final = resFin[0].data / 1000;
                                const total = final - inicial;

                                // Filtro de seguridad (mayor de 0 km)
                                if (total > 0) { 
                                    return { n: dev.name, m: dev.licensePlate || "-", i: inicial, f: final, t: total };
                                }
                            }
                        }
                        return null; // Devolvemos null si no hay datos válidos
                    });

                    status.innerText = `Consultando MyGeotab en paralelo para toda la flota...`;

                    // 3. Ejecutar todas las promesas de forma simultánea (La magia de v2.1)
                    // Esto envía todas las peticiones a Geotab a la vez.
                    const rawResults = await Promise.all(promises);

                    // 4. Filtrar los resultados nulos y preparar listado
                    listado = rawResults.filter(r => r !== null);

                    // 5. Renderizar la tabla de una sola vez (mejor rendimiento visual)
                    if (listado.length > 0) {
                        tbody.innerHTML = listado.map(r => `
                            <tr>
                                <td class="text-left">${r.n}</td>
                                <td class="text-left"><strong>${r.m}</strong></td>
                                <td class="text-right">${r.i.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                <td class="text-right">${r.f.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                <td class="text-right highlight">${r.t.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                            </tr>
                        `).join('');
                        
                        status.style.color = "#28a745"; // Color verde éxito
                        status.innerText = `Éxito: Se han encontrado datos de tacógrafo para ${listado.length} vehículos.`;
                        btnCsv.style.display = "inline-block";
                    } else {
                        status.style.color = "#dc3545"; // Color rojo error
                        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No se han encontrado vehículos con datos de tacógrafo coherentes para este año.</td></tr>`;
                        status.innerText = "Proceso finalizado: No hay datos disponibles.";
                    }

                } catch (e) {
                    status.style.color = "#dc3545";
                    status.innerText = "Error crítico en la consulta: " + e.message;
                    console.error(e);
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", () => {
                if (listado.length === 0) return;
                // Usamos punto y coma para CSV compatible con Excel en español
                let csv = "\uFEFFVehículo;Matrícula;Odómetro Inicial (km);Odómetro Final (km);KM Totales (Año)\n";
                listado.forEach(r => {
                    // Reemplazamos puntos por comas para los decimales si Excel está en español
                    csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_Tacho_Gasoleo_${document.getElementById("selYear").value}.csv`;
                link.click();
            });
            callback();
        }
    };
};