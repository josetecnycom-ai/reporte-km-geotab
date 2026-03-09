geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                tbody.innerHTML = "";
                var selectedYear = parseInt(document.getElementById("selYear").value);
                status.innerHTML = "<strong>Iniciando análisis de odómetro CAN/TGD...</strong>";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var i = 0;
                    var encontrados = 0;
                    var currentYear = new Date().getFullYear();

                    // Procesamiento secuencial para NO bloquear la pantalla
                    function procesarSiguiente() {
                        if (i >= devices.length) {
                            status.innerHTML = "<strong>¡Proceso completado!</strong> Vehículos con datos: " + encontrados;
                            btn.disabled = false;
                            return;
                        }

                        var dev = devices[i];
                        status.innerText = "Analizando (" + (i + 1) + "/" + devices.length + "): " + dev.name;

                        // 1. Buscamos el PRIMER dato del año seleccionado (Francotirador: resultsLimit 1)
                        api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                fromDate: selectedYear + "-01-01T00:00:00Z"
                            }
                        }, function (resIni) {
                            var iniKm = (resIni && resIni.length > 0) ? resIni[0].data / 1000 : null;

                            if (iniKm === null) {
                                // Si no hay datos, saltamos al siguiente rápidamente
                                i++;
                                setTimeout(procesarSiguiente, 20);
                                return;
                            }

                            // Función interna para pintar la fila si todo es correcto
                            function pintarFila(finKm) {
                                if (finKm !== null) {
                                    var total = finKm - iniKm;
                                    
                                    // EL FILTRO MÁGICO: Ignoramos el error de 1.7 millones de km
                                    if (total >= 0 && finKm < 1600000) {
                                        encontrados++;
                                        var row = "<tr>" +
                                            "<td>" + dev.name + "</td>" +
                                            "<td>" + (dev.licensePlate || "-") + "</td>" +
                                            "<td style='text-align:right'>" + iniKm.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                            "<td style='text-align:right'>" + finKm.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                            "<td style='text-align:right; font-weight:bold; color:#004683; background:#e8f4f8;'>" + total.toLocaleString('es-ES', {maximumFractionDigits:1}) + " km</td>" +
                                            "</tr>";
                                        tbody.innerHTML += row;
                                    }
                                }
                                i++;
                                setTimeout(procesarSiguiente, 20); // Pausa para que el navegador respire
                            }

                            // 2. Buscamos el ÚLTIMO dato
                            if (selectedYear < currentYear) {
                                // Si es un año pasado (ej. 2025), el final es el inicio de 2026
                                api.call("Get", {
                                    typeName: "StatusData",
                                    resultsLimit: 1,
                                    search: {
                                        deviceSearch: { id: dev.id },
                                        diagnosticSearch: { id: "DiagnosticOdometerId" },
                                        fromDate: (selectedYear + 1) + "-01-01T00:00:00Z"
                                    }
                                }, function (resFin) {
                                    var finKm = (resFin && resFin.length > 0) ? resFin[0].data / 1000 : null;
                                    pintarFila(finKm);
                                });
                            } else {
                                // Si es el año actual (ej. 2026), el final es el odómetro a día de HOY
                                api.call("Get", {
                                    typeName: "DeviceStatusInfo",
                                    search: { deviceSearch: { id: dev.id } }
                                }, function (resStatus) {
                                    var finKm = (resStatus && resStatus.length > 0 && resStatus[0].odometer) ? resStatus[0].odometer / 1000 : null;
                                    pintarFila(finKm);
                                });
                            }
                        });
                    }
                    
                    procesarSiguiente();
                });
            };
            callback();
        },
        focus: function () {}, blur: function () {}
    };
};