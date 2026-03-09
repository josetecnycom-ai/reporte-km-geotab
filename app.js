geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                status.innerHTML = "<strong>Extrayendo datos de KPI diarios...</strong>";
                tbody.innerHTML = "";
                var year = document.getElementById("selYear").value;

                // Pedimos el resumen de datos ya procesado (lo que Ace llama VehicleKPI_Daily)
                api.call("Get", {
                    typeName: "DeviceStatusInfo"
                }, function (devices) {
                    var procesados = 0;
                    
                    devices.forEach(function (deviceInfo) {
                        var devId = deviceInfo.device.id;
                        var name = deviceInfo.device.name || "Vehículo " + devId;

                        // Buscamos el primer y último registro del año para este dispositivo
                        api.call("Get", {
                            typeName: "LogRecord",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: devId },
                                fromDate: year + "-01-01T00:00:00Z",
                                toDate: year + "-01-02T00:00:00Z"
                            }
                        }, function (firstLog) {
                            api.call("Get", {
                                typeName: "LogRecord",
                                resultsLimit: 1,
                                search: {
                                    deviceSearch: { id: devId },
                                    toDate: (parseInt(year) + 1) + "-01-01T00:00:00Z"
                                }
                            }, function (lastLog) {
                                if (firstLog.length > 0 && lastLog.length > 0) {
                                    // Usamos los datos de motor resumidos
                                    var ini = firstLog[0].distance / 1000;
                                    var fin = lastLog[0].distance / 1000;
                                    var total = fin - ini;

                                    if (total > 0 && fin < 1600000) {
                                        var fila = "<tr>" +
                                            "<td>" + name + "</td>" +
                                            "<td style='text-align:right'>" + ini.toLocaleString('es-ES') + "</td>" +
                                            "<td style='text-align:right'>" + fin.toLocaleString('es-ES') + "</td>" +
                                            "<td style='text-align:right; font-weight:bold; color:#004683;'>" + total.toLocaleString('es-ES') + " km</td>" +
                                            "</tr>";
                                        tbody.innerHTML += fila;
                                    }
                                }
                                procesados++;
                                status.innerText = "Vehículos analizados: " + procesados;
                                if (procesados >= devices.length) {
                                    status.innerHTML = "<strong>Reporte generado con éxito.</strong>";
                                    btn.disabled = false;
                                }
                            });
                        });
                    });
                });
            };
            callback();
        },
        focus: function () {}, blur: function () {}
    };
};