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
                status.innerHTML = "<strong>Iniciando análisis profundo de odómetro. Por favor, espere...</strong>";

                api.call("Get", { typeName: "Device" }, function (devices) {
                    var i = 0;
                    var currentYear = new Date().getFullYear();

                    function procesarSiguiente() {
                        if (i >= devices.length) {
                            reportData.sort(function(a, b) {
                                return a.name.localeCompare(b.name);
                            });

                            reportData.forEach(function(row) {
                                var tr = "<tr>" +
                                    "<td class='cell-name'><strong>" + row.name + "</strong></td>" +
                                    "<td>" + row.plate + "</td>" +
                                    "<td class='num cell-odo'>" + row.ini.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                    "<td class='num cell-odo'>" + row.fin.toLocaleString('es-ES', {maximumFractionDigits:1}) + "</td>" +
                                    "<td class='num total-col'>" + row.total.toLocaleString('es-ES', {maximumFractionDigits:1}) + " km</td>" +
                                    "</tr>";
                                tbody.innerHTML += tr;
                            });

                            status.innerHTML = "<strong>¡Proceso completado!</strong> Vehículos analizados: " + reportData.length;
                            btnRun.disabled = false;
                            if (reportData.length > 0) {
                                btnExport.style.display = "inline-flex"; 
                            }
                            return;
                        }

                        var dev = devices[i];
                        status.innerText = "Extrayendo datos (" + (i + 1) + "/" + devices.length + "): " + dev.name;

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
                                i++;
                                setTimeout(procesarSiguiente, 15);
                                return;
                            }

                            function guardarDato(finKm) {
                                if (finKm !== null) {
                                    var total = finKm - iniKm;
                                    if (total >= 0 && finKm < 1600000) {
                                        reportData.push({
                                            name: dev.name,
                                            plate: dev.licensePlate || "-",
                                            ini: iniKm,
                                            fin: finKm,
                                            total: total
                                        });
                                    }
                                }
                                i++;
                                setTimeout(procesarSiguiente, 15);
                            }

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
                                    guardarDato(finKm);
                                });
                            } else {
                                api.call("Get", {
                                    typeName: "DeviceStatusInfo",
                                    search: { deviceSearch: { id: dev.id } }
                                }, function (resStatus) {
                                    var finKm = (resStatus && resStatus.length > 0 && resStatus[0].odometer) ? resStatus[0].odometer / 1000 : null;
                                    guardarDato(finKm);
                                });
                            }
                        });
                    }
                    procesarSiguiente();
                });
            };

            btnExport.onclick = function() {
                var csv = "Vehículo;Matrícula;Odómetro Inicial (km);Odómetro Final (km);Total Recorrido (km)\n";
                reportData.forEach(function(row) {
                    var iniStr = row.ini.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    var finStr = row.fin.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    var totStr = row.total.toLocaleString('es-ES', {maximumFractionDigits:1, useGrouping:false});
                    csv += row.name + ";" + row.plate + ";" + iniStr + ";" + finStr + ";" + totStr + "\n";
                });
                var blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
                var link = document.createElement("a");
                var url = URL.createObjectURL(blob);
                var year = document.getElementById("selYear").value;
                link.setAttribute("href", url);
                link.setAttribute("download", "Reporte_Oficial_TGD_" + year + ".csv");
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