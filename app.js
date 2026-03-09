geotab.addin.reporteKm = function () {
    return {
        initialize: function (api, state, callback) {
            document.getElementById("btnRun").onclick = function () {
                var tbody = document.getElementById("tblBody");
                tbody.innerHTML = "<tr><td colspan='5'>Consultando...</td></tr>";
                
                api.call("Get", {
                    typeName: "DeviceStatusInfo"
                }, function (results) {
                    tbody.innerHTML = "";
                    results.forEach(function (res) {
                        var odo = res.odometer ? (res.odometer / 1000).toFixed(0) : "0";
                        var row = "<tr><td>" + res.device.id + "</td><td>-</td><td>-</td><td>" + odo + "</td><td>En vivo</td></tr>";
                        tbody.innerHTML += row;
                    });
                });
            };
            callback();
        },
        focus: function () {}, blur: function () {}
    };
};