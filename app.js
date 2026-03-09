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
                    status.innerText = "1/3 - Obteniendo lista de vehículos...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    if (devices.length === 0) {
                        status.innerText = "No se encontraron vehículos.";
                        btn.disabled = false;
                        return;
                    }

                    // Bucle seguro: Uno a uno para que no se cuelgue si un camión falla
                    for (let i = 0; i < devices.length; i++) {
                        let dev = devices[i];
                        status.innerText = `2/3 - Procesando (${i + 1}/${devices.length}): ${dev.name}...`;

                        try {
                            const callIni = api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: "DiagnosticOdometerId" }, fromDate: `${year}-01-01T00:00:00Z` }
                            });

                            const callFin = api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: "DiagnosticOdometerId" }, toDate: `${year}-12-31T23:59:59Z` }
                            });

                            const [resIni, resFin] = await Promise.all([callIni, callFin]);

                            // Verificar que existen ambos datos y son de fechas distintas
                            if (resIni.length > 0 && resFin.length > 0 && resIni[0].dateTime !== resFin[0].dateTime) {
                                const iKm = resIni[0].data / 1000;
                                const fKm = resFin[0].data / 1000;
                                const total = fKm - iKm;

                                if (total > 0) {
                                    const r = { n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total };
                                    listado.push(r);
                                    
                                    // Dibujar la fila inmediatamente para que veas el progreso
                                    tbody.innerHTML += `
                                        <tr>
                                            <td>${r.n}</td>
                                            <td><strong>${r.m}</strong></td>
                                            <td style="text-align:right">${r.i.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                            <td style="text-align:right">${r.f.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                            <td style="text-align:right; font-weight:bold; color:#243665; background:#f0f4ff;">${r.t.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            }
                        } catch (err) {
                            console.warn(`Error al consultar vehículo ${dev.name}. Se omite.`, err);
                            // Si falla un vehículo, el bucle NO se rompe, sigue con el siguiente.
                        }
                    }

                    status.innerText = `3/3 - ¡Completado! Se encontraron ${listado.length} vehículos con datos.`;
                    status.style.color = "#28a745";
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error crítico: " + e.message;
                    status.style.color = "#dc3545";
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                if (listado.length === 0) return;
                let csv = "\uFEFFVehículo;Matrícula;Odómetro Inicial (km);Odómetro Final (km);KM Totales (Año)\n";
                listado.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_Gasoleo_${document.getElementById("selYear").value}.csv`;
                link.click();
            });

            callback();
        },
        focus: function (api, state) {
            // Requerido por Geotab para mostrar el iframe correctamente
        },
        blur: function (api, state) {
            // Requerido por Geotab
        }
    };
};