geotab.addin.reporteKm = function () {
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
                status.innerText = "Cargando flota...";
                
                const year = document.getElementById("selYear").value;
                const DIAG_TGD = "DiagnosticTachographTotalVehicleDistanceId";
                const DIAG_ODO = "DiagnosticOdometerId";

                try {
                    const devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    // Preparamos todas las llamadas en un solo paquete (MultiCall)
                    let calls = [];
                    devices.forEach(dev => {
                        // Llamada 1: Último valor antes de empezar el año (Odo Inicial)
                        calls.push(["Get", {
                            typeName: "StatusData", resultsLimit: 1,
                            search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, toDate: `${year}-01-01T00:00:00Z` }
                        }]);
                        // Llamada 2: Último valor antes de terminar el año (Odo Final)
                        calls.push(["Get", {
                            typeName: "StatusData", resultsLimit: 1,
                            search: { deviceSearch: { id: dev.id }, diagnosticSearch: { id: DIAG_TGD }, toDate: `${year}-12-31T23:59:59Z` }
                        }]);
                    });

                    status.innerText = `Procesando ${devices.length} vehículos simultáneamente...`;
                    const allResults = await api.call("MultiCall", { calls: calls });

                    let listado = [];
                    for (let i = 0; i < devices.length; i++) {
                        const dev = devices[i];
                        const resIni = allResults[i * 2];
                        const resFin = allResults[(i * 2) + 1];

                        if (resIni.length > 0 && resFin.length > 0) {
                            let iKm = resIni[0].data / 1000;
                            let fKm = resFin[0].data / 1000;
                            
                            // FILTRO DE SEGURIDAD: Si el camión marca más de 1.5 millones de KM, 
                            // es un error de centralita (como el de 1.7M que vimos). Lo ignoramos.
                            if (fKm > 1500000) continue; 

                            let total = fKm - iKm;

                            if (total > 0) {
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
                        }
                    }

                    status.innerText = `¡Listo! Se han recuperado ${listado.length} vehículos con datos válidos.`;
                    if (listado.length > 0) btnCsv.style.display = "inline-block";
                    window.listadoData = listado; // Guardar para CSV

                } catch (e) {
                    status.innerText = "Error de conexión: " + e.message;
                    console.error(e);
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                if (!window.listadoData) return;
                let csv = "\uFEFFVehículo;Matrícula;Odo Inicial;Odo Final;Total\n";
                window.listadoData.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Reporte_Gasoleo_v8.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};