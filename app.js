geotab.addin.reporteKm = function () {
    var reportData = []; 

    return {
        initialize: function (api, state, callback) {
            var btnRun = document.getElementById("btnRun");
            var btnExport = document.getElementById("btnExport");
            var status = document.getElementById("status-bar");
            var tbody = document.getElementById("tblBody");

            btnRun.onclick = function () {
                btnRun.disabled = true;
                btnExport.style.display = "none";
                tbody.innerHTML = "";
                reportData = []; 
                var selectedYear = parseInt(document.getElementById("selYear").value);
                status.innerHTML = "<strong>Analizando odómetros y fechas exactas. Por favor, espere...</strong>";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var i = 0;
                    var currentYear = new Date().getFullYear();

                    function procesarSiguiente() {
                        if (i >= devices.length) {
                            reportData.sort(function(a, b) { return a.name.localeCompare(b.name); });

                            reportData.forEach(function(row) {
                                var tr = "<tr>" +
                                    "<td class='cell-name'><strong>" + row.name + "</strong></td>" +
                                    "<td>" + row.plate + "</td>" +
                                    "<td style='color:#008767; font-size:12px; font-weight:bold;'>" + row.source + "</td>" +
                                    "<td class='date-col'>" + row.iniDate + "</td>" +
                                    "<td class='num cell-odo'>" + row.ini.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                    "<td class='date-col'>" + row.finDate + "</td>" +
                                    "<td class='num cell-odo'>" + row.fin.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                    "<td class='num total-col'>" + row.total.toLocaleString('es-ES', {maximumFractionDigits:1}) + " km</td>" +
                                    "</tr>";
                                tbody.innerHTML += tr;
                            });

                            status.innerHTML = "<strong>¡Proceso completado!</strong> Vehículos analizados: " + reportData.length;
                            btnRun.disabled = false;
                            if (reportData.length > 0) { btnExport.style.display = "inline-flex"; }
                            return;
                        }

                        var dev = devices[i];
                        status.innerText = "Extrayendo datos (" + (i + 1) + "/" + devices.length + "): " + dev.name;

                        // 1. OBTENER DATO INICIAL Y SU FECHA
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
                            var iniDate = (resIni && resIni.length > 0) ? new Date(resIni[0].dateTime).toLocaleDateString('es-ES') : "-";

                            if (iniKm === null) {
                                i++;
                                setTimeout(procesarSiguiente, 15);
                                return;
                            }

                            function guardarDato(finKm, finDate) {
                                if (finKm !== null) {
                                    var total = finKm - iniKm;
                                    if (total >= 0 && finKm < 3000000) {
                                        reportData.push({
                                            name: dev.name,
                                            plate: dev.licensePlate || "-",
                                            source: "Sistema (Auto)", // Mantenemos el origen general por rendimiento
                                            iniDate: iniDate,
                                            ini: iniKm,
                                            finDate: finDate,
                                            fin: finKm,
                                            total: total
                                        });
                                    }
                                }
                                i++;
                                setTimeout(procesarSiguiente, 15);
                            }

                            // 2. OBTENER DATO FINAL Y SU FECHA
                            if (selectedYear < currentYear) {
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
                                    var finDate = (resFin && resFin.length > 0) ? new Date(resFin[0].dateTime).toLocaleDateString('es-ES') : "-";
                                    guardarDato(finKm, finDate);
                                });
                            } else {
                                api.call("Get", {
                                    typeName: "DeviceStatusInfo",
                                    search: { deviceSearch: { id: dev.id } }
                                }, function (resStatus) {
                                    var finKm = (resStatus && resStatus.length > 0 && resStatus[0].odometer) ? resStatus[0].odometer / 1000 : null;
                                    // Si es el año actual, la fecha de fin es "Hoy"
                                    var finDate = new Date().toLocaleDateString('es-ES');
                                    guardarDato(finKm, finDate);
                                });
                            }
                        });
                    }
                    procesarSiguiente();
                });
            };

            // EXPORTACIÓN A CSV AMPLIADA
            btnExport.onclick = function() {
                var csv = "Vehículo;Matrícula;Sensor;Fecha Inicial;Odómetro Inicial (km);Fecha Final;Odómetro Final (km);Total Recorrido (km)\n";
                reportData.forEach(function(row) {
                    var iniStr = row.ini.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    var finStr = row.fin.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    var totStr = row.total.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    csv += row.name + ";" + row.plate + ";" + row.source + ";" + row.iniDate + ";" + iniStr + ";" + row.finDate + ";" + finStr + ";" + totStr + "\n";
                });
                var blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
                var link = document.createElement("a");
                var url = URL.createObjectURL(blob);
                var year = document.getElementById("selYear").value;
                link.setAttribute("href", url);
                link.setAttribute("download", "Auditoria_Gasoleo_" + year + ".csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            callback();
        },
        focus: function () {}, blur: function () {}
    };
};
