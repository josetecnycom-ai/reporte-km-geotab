geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                status.innerHTML = "<strong>Iniciando búsqueda profunda...</strong>";
                tbody.innerHTML = "";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var year = document.getElementById("selYear").value;
                    var i = 0;
                    var encontrados = 0;

                    function procesarVehiculo() {
                        if (i >= devices.length) {
                            status.innerHTML = "<strong>Finalizado.</strong> Se han listado " + encontrados + " vehículos.";
                            btn.disabled = false;
                            return;
                        }

                        var dev = devices[i];
                        status.innerText = "(" + (i + 1) + "/" + devices.length + ") Analizando: " + dev.name;

                        // BUSQUEDA TGD: Probamos con el ID estándar y si no, buscamos por texto
                        api.call("Get", {
                            typeName: "StatusData",
                            resultsLimit: 1,
                            search: {
                                deviceSearch: { id: dev.id },
                                diagnosticSearch: { id: "DiagnosticTachographTotalVehicleDistanceId" },
                                toDate: (parseInt(year) + 1) + "-01-01T00:00:00Z"
                            }
                        }, function (res) {
                            if (res && res.length > 0) {
                                // Si encontramos datos TGD, calculamos el rango del año
                                var finKm = res[0].data / 1000;
                                
                                api.call("Get", {
                                    typeName: "StatusData",
                                    resultsLimit: 1,
                                    search: {
                                        deviceSearch: { id: dev.id },
                                        diagnosticSearch: { id: "DiagnosticTachographTotalVehicleDistanceId" },
                                        toDate: year + "-01-01T00:00:00Z"
                                    }
                                }, function (resIni) {
                                    var iniKm = (resIni && resIni.length > 0) ? resIni[0].data / 1000 : 0;
                                    var total = finKm - iniKm;

                                    // Filtro de seguridad para el error de los 1.7M de km
                                    if (finKm < 1600000 && total > 0) {
                                        encontrados++;
                                        var fila = "<tr>" +
                                            "<td>" + dev.name + "</td>" +
                                            "<td>" + (dev.licensePlate || "-") + "</td>" +
                                            "<td style='text-align:right'>" + iniKm.toLocaleString('es-ES') + "</td>" +
                                            "<td style='text-align:right'>" + finKm.toLocaleString('es-ES') + "</td>" +
                                            "<td style='text-align:right; font-weight:bold; color:blue;'>" + total.toLocaleString('es-ES') + " km</td>" +
                                            "</tr>";
                                        tbody.innerHTML += fila;
                                    }
                                    i++;
                                    setTimeout(procesarVehiculo, 30);
                                });
                            } else {
                                // Si no hay TGD, saltamos al siguiente rápidamente
                                i++;
                                procesarVehiculo();
                            }
                        });
                    }
                    procesarVehiculo();
                });
            };
            callback();
        },
        focus: function () {},
        blur: function () {}
    };
};