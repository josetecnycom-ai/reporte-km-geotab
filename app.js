geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                tbody.innerHTML = "";
                status.innerText = "Iniciando consulta secuencial...";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var year = document.getElementById("selYear").value;
                    var index = 0;

                    function consultarSiguiente() {
                        if (index >= devices.length) {
                            status.innerText = "Proceso completado.";
                            btn.disabled = false;
                            return;
                        }

                        var dev = devices[index];
                        status.innerText = "Analizando (" + (index + 1) + "/" + devices.length + "): " + dev.name;

                        // Buscamos el odómetro exacto (DiagnosticOdometerId)
                        api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticOdometerId" },
                                toDate: (parseInt(year) + 1) + "-01-01T00:00:00Z"
                            }
                        }, function (resFin) {
                            api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: {
                                    deviceSearch: { id: dev.id },
                                    diagnosticSearch: { id: "DiagnosticOdometerId" },
                                    toDate: year + "-01-01T00:00:00Z"
                                }
                            }, function (resIni) {
                                if (resIni.length > 0 && resFin.length > 0) {
                                    var ini = resIni[0].data / 1000;
                                    var fin = resFin[0].data / 1000;
                                    var total = fin - ini;

                                    if (total > 0 && fin < 1600000) {
                                        var row = "<tr><td>" + dev.name + "</td><td>" + (dev.licensePlate || "-") + "</td><td>" + ini.toFixed(1) + "</td><td>" + fin.toFixed(1) + "</td><td style='font-weight:bold; color:blue'>" + total.toFixed(1) + " km</td></tr>";
                                        tbody.innerHTML += row;
                                    }
                                }
                                index++;
                                // Pausa de 100ms entre vehículos para evitar bloqueos
                                setTimeout(consultarSiguiente, 100);
                            });
                        });
                    }
                    consultarSiguiente();
                });
            };
            callback();
        },
        focus: function () {}, blur: function () {}
    };
};