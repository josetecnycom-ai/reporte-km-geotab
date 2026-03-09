geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            var btn = document.getElementById("btnRun");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btn.onclick = function () {
                btn.disabled = true;
                tbody.innerHTML = "";
                status.innerText = "Consultando resúmenes diarios...";

                api.call("Get", {
                    typeName: "Device"
                }, function (devices) {
                    var year = document.getElementById("selYear").value;
                    var counts = 0;

                    devices.forEach(function (device) {
                        // Buscamos el resumen diario (DailyData) que es lo que usa Ace
                        api.call("Get", {
                            typeName: "DailyData",
                            search: {
                                deviceSearch: { id: device.id },
                                fromDate: year + "-01-01T00:00:00Z",
                                toDate: year + "-12-31T23:59:59Z"
                            }
                        }, function (dailyResults) {
                            if (dailyResults && dailyResults.length > 0) {
                                // Ordenamos para asegurar primer y último día
                                dailyResults.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
                                
                                var firstDay = dailyResults[0];
                                var lastDay = dailyResults[dailyResults.length - 1];

                                var odoIni = firstDay.odometer / 1000;
                                var odoFin = lastDay.odometer / 1000;
                                var total = odoFin - odoIni;

                                // Filtro para evitar errores de centralita conocidos
                                if (total > 0 && odoFin < 1600000) {
                                    var row = "<tr>" +
                                        "<td>" + device.name + "</td>" +
                                        "<td>" + (device.licensePlate || "-") + "</td>" +
                                        "<td>" + odoIni.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                        "<td>" + odoFin.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                        "<td style='font-weight:bold; color:blue'>" + total.toLocaleString('es-ES', {maximumFractionDigits:1}) + " km</td>" +
                                        "</tr>";
                                    tbody.innerHTML += row;
                                }
                            }
                            counts++;
                            status.innerText = "Procesados " + counts + " de " + devices.length;
                            if (counts >= devices.length) {
                                status.innerText = "Informe finalizado.";
                                btn.disabled = false;
                            }
                        });
                    });
                });
            };
            callback();
        },
        focus: function () {}, blur: function () {}
    };
};