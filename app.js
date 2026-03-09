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
                    status.innerText = "Obteniendo lista de vehículos...";
                    const devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    // FUNCIÓN PARA PAUSAR Y EVITAR BLOQUEOS
                    const sleep = () => new Promise(r => setTimeout(r, 10));

                    for (let i = 0; i < devices.length; i++) {
                        const dev = devices[i];
                        status.innerHTML = `Procesando: <strong>${dev.name}</strong> (${i + 1}/${devices.length})`;
                        
                        // Pequeña pausa cada camión para que la web no se congele
                        await sleep();

                        try {
                            // Buscamos el valor inicial y final
                            const resIni = await api.call("Get", {
                                typeName: "StatusData", resultsLimit: 1,
                                search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, fromDate: `${year}-01-01T00:00:00Z` }
                            });

                            const resFin = await api.call("Get", {
                                typeName: "StatusData", resultsLimit: 1,
                                search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, toDate: `${year}-12-31T23:59:59Z` }
                            });

                            if (resIni.length > 0 && resFin.length > 0) {
                                let iKm = resIni[0].data / 1000;
                                let fKm = resFin[0].data / 1000;
                                
                                // Saltamos si el dato es el error de 1.7 millones que vimos en capturas
                                if (fKm > 1500000) continue; 

                                let total = fKm - iKm;

                                if (total >= 0) {
                                    listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                    const row = `<tr>
                                        <td>${dev.name}</td>
                                        <td>${dev.licensePlate || "S/M"}</td>
                                        <td style="text-align:right">${iKm.toLocaleString('es-ES',{minimumFractionDigits:1})}</td>
                                        <td style="text-align:right">${fKm.toLocaleString('es-ES',{minimumFractionDigits:1})}</td>
                                        <td style="text-align:right; font-weight:bold; background:#eef;">${total.toLocaleString('es-ES',{minimumFractionDigits:1})} km</td>
                                    </tr>`;
                                    tbody.insertAdjacentHTML('beforeend', row);
                                }
                            }
                        } catch (err) { console.warn("Error en camión " + dev.name); }
                    }

                    status.innerText = `Finalizado. ${listado.length} vehículos con datos TGD.`;
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error general: " + e.message;
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
                link.download = `Reporte_Kilometraje_TGD.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};