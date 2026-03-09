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
                listado = [];
                const year = document.getElementById("selYear").value;
                const DIAG_TGD = "DiagnosticTachographTotalVehicleDistanceId";

                try {
                    status.innerText = "Recuperando flota de vehículos...";
                    const devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

                    for (let i = 0; i < devices.length; i++) {
                        const dev = devices[i];
                        status.innerHTML = `Analizando: <strong>${dev.name}</strong> (${i+1}/${devices.length})`;
                        
                        // Pausa de 20ms para que el navegador respire y no se cuelgue
                        await sleep(20);

                        try {
                            // LÓGICA DE BÚSQUEDA MEJORADA:
                            // Buscamos el último registro disponible justo antes de que empiece el año y justo antes de que acabe.
                            const [resIni, resFin] = await Promise.all([
                                api.call("Get", {
                                    typeName: "StatusData", resultsLimit: 1,
                                    search: { 
                                        deviceSearch: { id: dev.id }, 
                                        diagnosticSearch: { id: DIAG_TGD }, 
                                        toDate: `${year}-01-01T00:00:00Z` // Estado al inicio
                                    }
                                }),
                                api.call("Get", {
                                    typeName: "StatusData", resultsLimit: 1,
                                    search: { 
                                        deviceSearch: { id: dev.id }, 
                                        diagnosticSearch: { id: DIAG_TGD }, 
                                        toDate: `${parseInt(year) + 1}-01-01T00:00:00Z` // Estado al final
                                    }
                                })
                            ]);

                            if (resIni && resIni.length > 0 && resFin && resFin.length > 0) {
                                let iKm = resIni[0].data / 1000;
                                let fKm = resFin[0].data / 1000;
                                
                                // Filtro para ignorar el error de los 1.7 millones (image_034076.png)
                                if (fKm > 1600000 || iKm > 1600000) continue;

                                let total = fKm - iKm;

                                if (total >= 0) {
                                    listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                    tbody.innerHTML += `
                                        <tr>
                                            <td>${dev.name}</td>
                                            <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                            <td style="text-align:right">${iKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right">${fKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right; font-weight:bold; background:#e8f4f8; color:#243665;">${total.toLocaleString('es-ES', {minimumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            }
                        } catch (err) {
                            console.error("Error en vehículo " + dev.name, err);
                        }
                    }

                    status.innerText = listado.length > 0 ? `Proceso completado. ${listado.length} vehículos encontrados.` : "No se han encontrado datos TGD para este periodo.";
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error crítico: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                let csv = "\uFEFFVehículo;Matrícula;Km Inicial;Km Final;Total\n";
                listado.forEach(r => { 
                    csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; 
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_TGD_${document.getElementById("selYear").value}.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};