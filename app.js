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
                    status.innerText = "Consultando flota...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));
                    
                    // SEGÚN MANUAL: El diagnóstico de ajuste es el que vincula el Tacógrafo
                    const TGD_DIAGNOSTIC = "DiagnosticOdometerAdjustmentId";

                    for (let i = 0; i < devices.length; i++) {
                        let dev = devices[i];
                        status.innerText = `Procesando (${i + 1}/${devices.length}): ${dev.name}...`;

                        try {
                            // Buscamos el primer dato del año (hacia adelante desde el 1 de enero)
                            const resIni = await api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { 
                                    deviceSearch: { id: dev.id }, 
                                    diagnosticSearch: { id: TGD_DIAGNOSTIC }, 
                                    fromDate: `${year}-01-01T00:00:00Z` 
                                }
                            });

                            // Buscamos el último dato del año (hacia atrás desde el 31 de diciembre)
                            const resFin = await api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: { 
                                    deviceSearch: { id: dev.id }, 
                                    diagnosticSearch: { id: TGD_DIAGNOSTIC }, 
                                    toDate: `${year}-12-31T23:59:59Z` 
                                }
                            });

                            if (resIni.length > 0 && resFin.length > 0) {
                                const iKm = resIni[0].data / 1000;
                                const fKm = resFin[0].data / 1000;
                                const total = fKm - iKm;

                                if (total >= 0) {
                                    listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                    tbody.innerHTML += `
                                        <tr>
                                            <td>${dev.name}</td>
                                            <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                            <td style="text-align:right">${iKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right">${fKm.toLocaleString('es-ES', {minimumFractionDigits:1})}</td>
                                            <td style="text-align:right; font-weight:bold; color:#243665; background:#e8f4f8;">${total.toLocaleString('es-ES', {minimumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            } else {
                                // Si no hay datos, mostramos la fila vacía para saber que el camión existe
                                tbody.innerHTML += `<tr style="color: #999;"><td>${dev.name}</td><td>${dev.licensePlate || "S/M"}</td><td colspan="3" style="text-align:center">Sin datos de ajuste/tacógrafo encontrados</td></tr>`;
                            }
                        } catch (err) {
                            console.error("Error en dispositivo", dev.name, err);
                        }
                    }

                    status.innerText = "Informe generado correctamente.";
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial;Odo Final;Total\n";
                listado.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Reporte_KM_TGD.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};