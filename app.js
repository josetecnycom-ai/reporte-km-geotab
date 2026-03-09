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
                const year = document.getElementById("selYear").value;
                listado = [];

                try {
                    status.innerText = "1/3 - Localizando vehículos...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    // Los 3 IDs más probables para datos de Tacógrafo TGD en España
                    const TGD_DIAGS = [
                        "DiagnosticTachographTotalVehicleDistanceId",
                        "DiagnosticTachographTotalDistanceId",
                        "DiagnosticOdometerAdjustmentId"
                    ];

                    for (let i = 0; i < devices.length; i++) {
                        let dev = devices[i];
                        status.innerText = `2/3 - Analizando sensores TGD (${i + 1}/${devices.length}): ${dev.name}...`;

                        let foundData = null;

                        // Probamos cada sensor hasta encontrar uno que tenga datos reales
                        for (let diagId of TGD_DIAGS) {
                            try {
                                const [resIni, resFin] = await Promise.all([
                                    api.call("Get", {
                                        typeName: "StatusData",
                                        resultsLimit: 1,
                                        search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: diagId }, fromDate: `${year}-01-01T00:00:00Z` }
                                    }),
                                    api.call("Get", {
                                        typeName: "StatusData",
                                        resultsLimit: 1,
                                        search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: diagId }, toDate: `${year}-12-31T23:59:59Z` }
                                    })
                                ]);

                                if (resIni.length > 0 && resFin.length > 0) {
                                    const valIni = resIni[0].data / 1000;
                                    const valFin = resFin[0].data / 1000;
                                    const diff = valFin - valIni;

                                    // Filtro de seguridad: Si el dato es coherente (menos de 1.5M km y positivo)
                                    if (diff >= 0 && valFin < 1500000) {
                                        foundData = { i: valIni, f: valFin, t: diff, sensor: diagId };
                                        break; // Encontrado sensor correcto, saltamos al siguiente vehículo
                                    }
                                }
                            } catch (e) { continue; }
                        }

                        if (foundData) {
                            listado.push({ n: dev.name, m: dev.licensePlate || "S/M", ...foundData });
                            tbody.innerHTML += `
                                <tr>
                                    <td>${dev.name}</td>
                                    <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                    <td style="text-align:right">${foundData.i.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                    <td style="text-align:right">${foundData.f.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                    <td style="text-align:right; font-weight:bold; color:#243665; background:#e8f4f8;">${foundData.t.toLocaleString('es-ES', {minimumFractionDigits:1})} km</td>
                                </tr>`;
                        } else {
                            tbody.innerHTML += `<tr style="color: #999;"><td>${dev.name}</td><td>${dev.licensePlate || "S/M"}</td><td colspan="3" style="text-align:center">No se detectan datos TGD válidos</td></tr>`;
                        }
                    }

                    status.innerText = `3/3 - Informe finalizado. ${listado.length} vehículos con datos correctos.`;
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                let csv = "\uFEFFVehículo;Matrícula;Km Inicial;Km Final;Total Recorrido\n";
                listado.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Reporte_Gasoleo_TGD_Final.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};