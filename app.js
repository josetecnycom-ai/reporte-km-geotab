geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                status.innerText = "Consultando vehículos...";
                tbody.innerHTML = "";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var year = document.getElementById("selYear").value;
                    var diagnostic = "DiagnosticTachographTotalVehicleDistanceId";
                    var i = 0;

                    function procesarSiguiente() {
                        if (i >= devices.length) {
                            status.innerText = "Proceso finalizado.";
                            btn.disabled = false;
                            return;
                        }

                        var dev = devices[i];
                        status.innerText = "Procesando: " + dev.name;

                        // Consulta de inicio de año
                        api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: diagnostic },
                                toDate: year + "-01-01T00:00:00Z"
                            }
                        }, function (resIni) {
                            // Consulta de fin de año
                            api.call("Get", {
                                typeName: "StatusData",
                                resultsLimit: 1,
                                search: {
                                    deviceSearch: { id: dev.id },
                                    diagnosticSearch: { id: diagnostic },
                                    toDate: (parseInt(year) + 1) + "-01-01T00:00:00Z"
                                }
                            }, function (resFin) {
                                if (resIni.length > 0 && resFin.length > 0) {
                                    var ini = resIni[0].data / 1000;
                                    var fin = resFin[0].data / 1000;
                                    var total = fin - ini;

                                    if (total >= 0 && fin < 1600000) {
                                        var row = "<tr><td>" + dev.name + "</td><td>" + (dev.licensePlate || "-") + "</td><td>" + ini.toFixed(1) + "</td><td>" + fin.toFixed(1) + "</td><td style='font-weight:bold'>" + total.toFixed(1) + " km</td></tr>";
                                        tbody.innerHTML += row;
                                    }
                                }
                                i++;
                                setTimeout(procesarSiguiente, 50); // Pausa de seguridad
                            });
                        });
                    }
                    procesarSiguiente();
                }, function (err) {
                    status.innerText = "Error: " + err;
                    btn.disabled = false;
                });
            };
            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};