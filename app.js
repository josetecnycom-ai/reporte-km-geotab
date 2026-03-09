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
                    status.innerText = "Cargando lista de vehículos...";
                    const devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    status.innerText = `Analizando ${devices.length} vehículos...`;

                    // Procesamos uno a uno pero con actualizaciones de UI constantes para que no se bloquee
                    for (let i = 0; i < devices.length; i++) {
                        const dev = devices[i];
                        status.innerText = `Procesando (${i + 1}/${devices.length}): ${dev.name}`;

                        try {
                            // Pedimos el primer y último dato del año en una sola promesa
                            const [resIni, resFin] = await Promise.all([
                                api.call("Get", {
                                    typeName: "StatusData", resultsLimit: 1,
                                    search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, fromDate: `${year}-01-01T00:00:00Z` }
                                }),
                                api.call("Get", {
                                    typeName: "StatusData", resultsLimit: 1,
                                    search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, toDate: `${year}-12-31T23:59:59Z` }
                                })
                            ]);

                            if (resIni.length > 0 && resFin.length > 0) {
                                let iKm = resIni[0].data / 1000;
                                let fKm = resFin[0].data / 1000;
                                
                                // FILTRO CLAVE: Si el valor final es el error de 1.7 millones, lo descartamos
                                if (fKm > 1500000) continue; 

                                let total = fKm - iKm;

                                if (total >= 0) {
                                    listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                    tbody.innerHTML += `
                                        <tr>
                                            <td>${dev.name}</td>
                                            <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                            <td style="text-align:right">${iKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right">${fKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right; font-weight:bold; color:#243665; background:#f0f7fa;">${total.toLocaleString('es-ES', {minimumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            }
                        } catch (err) {
                            console.warn("Sin datos para " + dev.name);
                        }
                    }

                    status.innerText = `Informe finalizado. ${listado.length} vehículos procesados.`;
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                let csv = "\uFEFFVehículo;Matrícula;Km Inicial (TGD);Km Final (TGD);Total Recorrido\n";
                listado.forEach(r => { 
                    csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; 
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_Oficiales_TGD_${new Date().getTime()}.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};