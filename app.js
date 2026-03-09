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
                    status.innerText = "Consultando lista de activos...";
                    let devices = await api.call("Get", { typeName: "Device" });
                    devices.sort((a, b) => a.name.localeCompare(b.name));

                    for (let i = 0; i < devices.length; i++) {
                        let dev = devices[i];
                        status.innerText = `Buscando registros TGD (${i + 1}/${devices.length}): ${dev.name}...`;

                        try {
                            // CAMBIO CLAVE SEGÚN MANUAL: Buscamos en TachographData, no en StatusData
                            // Esto busca los datos procesados de los ficheros TGD
                            const tgdRecords = await api.call("Get", {
                                typeName: "TachographData",
                                search: {
                                    deviceSearch: { id: dev.id },
                                    fromDate: `${year}-01-01T00:00:00Z`,
                                    toDate: `${year}-12-31T23:59:59Z`
                                }
                            });

                            if (tgdRecords && tgdRecords.length > 0) {
                                // Ordenamos por fecha para asegurar que tenemos el primero y el último
                                tgdRecords.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
                                
                                const firstEntry = tgdRecords[0];
                                const lastEntry = tgdRecords[tgdRecords.length - 1];

                                // En TachographData el valor suele venir ya en KM o metros según configuración
                                // Si los valores son muy altos (millones), dividiremos por 1000
                                let iKm = firstEntry.distance;
                                let fKm = lastEntry.distance;
                                
                                // Ajuste de unidad: Geotab almacena TachographData.distance en metros
                                iKm = iKm / 1000;
                                fKm = fKm / 1000;
                                const total = fKm - iKm;

                                if (total > 0) {
                                    listado.push({ n: dev.name, m: dev.licensePlate || "S/M", i: iKm, f: fKm, t: total });
                                    tbody.innerHTML += `
                                        <tr>
                                            <td>${dev.name}</td>
                                            <td><strong>${dev.licensePlate || "S/M"}</strong></td>
                                            <td style="text-align:right">${iKm.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                            <td style="text-align:right">${fKm.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})}</td>
                                            <td style="text-align:right; font-weight:bold; color:#243665; background:#e8f4f8;">${total.toLocaleString('es-ES', {minimumFractionDigits:1, maximumFractionDigits:1})} km</td>
                                        </tr>`;
                                }
                            }
                        } catch (err) {
                            console.error("Error en TGD para " + dev.name, err);
                        }
                    }

                    status.innerText = listado.length > 0 ? `Informe TGD generado: ${listado.length} vehículos.` : "No se han encontrado registros en TachographData.";
                    if (listado.length > 0) btnCsv.style.display = "inline-block";

                } catch (e) {
                    status.innerText = "Error: " + e.message;
                } finally {
                    btn.disabled = false;
                }
            });

            btnCsv.addEventListener("click", function () {
                let csv = "\uFEFFVehículo;Matrícula;Odómetro Inicial TGD;Odómetro Final TGD;KM Totales\n";
                listado.forEach(r => { csv += `${r.n};${r.m};${r.i.toFixed(1).replace('.',',')};${r.f.toFixed(1).replace('.',',')};${r.t.toFixed(1).replace('.',',')}\n`; });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `KM_Tacografo_Oficial.csv`;
                link.click();
            });

            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};