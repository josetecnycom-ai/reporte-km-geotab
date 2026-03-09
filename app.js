geotab.addin.reporteKm = function () {
    let listado = [];
    
    return {
        initialize: function (api, state, callback) {
            const btn = document.getElementById("btnRun");
            const btnCsv = document.getElementById("btnCsv");
            const status = document.getElementById("status-bar");
            const tbody = document.querySelector("#tblData tbody");

            btn.addEventListener("click", async function () {
                btn.disabled = true;
                btnCsv.style.display = "none";
                tbody.innerHTML = "";
                status.style.display = "block";
                status.style.color = "#000";
                
                const year = document.getElementById("selYear").value;
                listado = [];

                try {
                    status.innerText = "1/3 - Obteniendo flota completa...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    if (devices.length === 0) {
                        status.innerText = "No se encontraron vehículos.";
                        btn.disabled = false;
                        return;
                    }

                    // Usamos EXCLUSIVAMENTE el sensor del tacógrafo (TGD)
                    const TACHO_SENSOR = "DiagnosticTachographTotalVehicleDistanceId";

                    for (let i = 0; i < devices.length; i++) {
                        let dev = devices[i];
                        status.innerText = `2/3 - Procesando (${i + 1}/${devices.length}): ${dev.name}...`;

                        try {
                            const callIni = api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { 
                                    deviceSearch: { id: dev.id }, 
                                    diagnosticSearch: { id: TACHO_SENSOR }, 
                                    fromDate: `${year}-01-01T00:00:00Z` 
                                }
                            });

                            const callFin = api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { 
                                    deviceSearch: { id: dev.id }, 
                                    diagnosticSearch: { id: TACHO_SENSOR }, 
                                    toDate: `${year}-12-31T23:59:59Z` 
                                }
                            });

                            const [resIni, resFin] = await Promise.all([callIni, callFin]);

                            let filaHTML = "";

                            // Si tiene datos de tacógrafo
                            if (resIni.length > 0 && resFin.length > 0) {
                                const iKm = resIni[0].data / 1000;
                                const fKm = resFin[0].data / 1000;
                                const total = fKm - iKm;

                                listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                
                                filaHTML = `
                                    <tr>
                                        <td>${dev.name}</td>
                                        <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                        <td style="text-align:right">${iKm.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                        <td style="text-align:right">${fKm.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                        <td style="text-align:right; font-weight:bold; color:#243665; background:#e8f4f8;">${total.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                    </tr>`;
                            } else {
                                // Si NO tiene datos de tacógrafo en esas fechas, lo mostramos igual para no perderlo
                                filaHTML = `
                                    <tr style="color: #999;">
                                        <td>${dev.name}</td>
                                        <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                        <td colspan="3" style="text-align:center; font-style:italic;">Sin datos de Tacógrafo (TGD) en este periodo</td>
                                    </tr>`;
                            }
                            
                            tbody.innerHTML += filaHTML;

                        } catch (err) {
                            console.warn(`Error en ${dev.name}:`, err);
                        }
                    }

                    status.innerText = `3/3 - ¡Completado! Flota analizada.`;
                    status.style.color = "#28a745";
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error: " + e.message;
                    status.style.color = "#dc3545";
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                if (listado.length === 0) return;
                let csv = "\uFEFFVehículo;Matrícula;Odómetro Inicial TGD (km);Odómetro Final TGD (km);KM Totales (Año)\n";
                listado.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Tacografo_Gasoleo_${document.getElementById("selYear").value}.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};