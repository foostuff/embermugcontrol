const connectButton = document.querySelector("#connect");
const disconnectButton = document.querySelector("#disconnect");
const mugname = document.querySelector("#mugname");
const updatename = document.querySelector("#updatename");
const targettemperature = document.querySelector("#targettemperature");
const updatetarget = document.querySelector("#updatetarget");
const logArea = document.querySelector("#log");

let mug = {
    uuid: "fc543622-236c-4c94-8fa9-944a3e5353fa",
    attr: {
        name: {
            uuid: "fc540001-236c-4c94-8fa9-944a3e5353fa",
            name: "Mug Name",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: "no name",
            convert() {
                let asciiString = "";
                for (let i = 0; i < this.lastdataview.byteLength; i++) {
                    asciiString += String.fromCharCode(this.lastdataview.getUint8(i));
                }
                this.lastvalue = asciiString;
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue
            },
            write(newname) {
                let intArray = newname.substring(0, 20).split('').map(function (c) { return c.charCodeAt(0); });
                let byteArray = new Uint8Array(intArray.length);
                for (let i = 0; i < intArray.length; i++)
                    byteArray[i] = intArray[i];
                writecharacteristic(this, byteArray)
                console.log(byteArray)
            }
        },
        temp: {
            uuid: "fc540002-236c-4c94-8fa9-944a3e5353fa",
            name: "Current Temperature",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 25,
            convert() {
                this.lastvalue = this.lastdataview.getInt16(0, true) / 100
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue + "°C"
            }
        },
        targettemp: {
            uuid: "fc540003-236c-4c94-8fa9-944a3e5353fa",
            name: "Target Temperature",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 30,
            convert() {
                this.lastvalue = this.lastdataview.getInt16(0, true) / 100
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue + "°C"
            },
            write(temperature) {
                if (temperature == Number(temperature))
                    temperature = Number(temperature)
                if (typeof (temperature) == 'number') {
                    if (temperature > 10 && temperature < 630) {
                        this.lastvalue = temperature
                        log("Setting new target temp:" + temperature)
                        const sendme = Uint16Array.of(temperature * 100);
                        writecharacteristic(this, sendme)
                    }
                    else {
                        log("Error: Temperature Range: 50-62.5°C", "error")
                    }
                }
                else
                    log("Not a number:" + temperature, "error")
            }
        },
        tempunit: {
            uuid: "fc540004-236c-4c94-8fa9-944a3e5353fa",
            name: "Temperature Unit",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            convert() {
                let s = Array("C", "F")
                this.lastvalue = s[this.lastdataview.getUint8(0)]
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue
            }
        },
        liquidlevel: {
            uuid: "fc540005-236c-4c94-8fa9-944a3e5353fa",
            name: "Liquid Level",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            convert() {
                this.lastvalue = this.lastdataview.getUint8(0)
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue + "(0-30,cannot be trusted)"
            }
        },
        time: {
            uuid: "fc540006-236c-4c94-8fa9-944a3e5353fa",
            name: "Time",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            convert() {
                this.lastvalue = new Date(this.lastdataview.getUint32(0, true) * 1000)
                this.timezone = this.lastdataview.getInt8(4)
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + "(" + Intl.DateTimeFormat().resolvedOptions().timeZone + "): " + this.lastvalue.toLocaleString() + "(not used)"
            }
        },
        battery: {
            uuid: "fc540007-236c-4c94-8fa9-944a3e5353fa",
            name: "Battery",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            charging: false,
            temp: 0,
            voltage: 0,
            convert() {
                this.lastvalue = this.lastdataview.getInt8(0)
                this.charging = (this.lastdataview.getInt8(1) == 1)
                this.temp = this.lastdataview.getInt16(2, true) / 100
                this.voltage = this.lastdataview.getInt8(4) //not used
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue + "%" + (this.charging && "+" || "-") + ", " + this.temp + "°C"
            }
        },
        state: {
            uuid: "fc540008-236c-4c94-8fa9-944a3e5353fa",
            name: "State",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: "unknown",
            convert() {
                let s = Array("", "mug empty", "filling", "", "🧊 cooling 🧊", "🔥 heating 🔥", "stable")
                this.lastvalue = s[this.lastdataview.getUint8(0)]
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue
            }
        },
        firmware: {
            uuid: "fc54000c-236c-4c94-8fa9-944a3e5353fa",
            name: "Firmware",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            hardware: 0,
            convert() {
                this.lastvalue = this.lastdataview.getInt16(0, true)
                this.hardware = this.lastdataview.getInt16(2, true)
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": " + this.lastvalue + " HW:" + this.hardware
            }
        },
        pushevent: {
            uuid: "fc540012-236c-4c94-8fa9-944a3e5353fa",
            name: "Push Event",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: 0,
            convert() {
                let s = Array("", "BAT", "CHARGING", "NOTCHARGING", "TARGETTEMP", "TEMP", "", "LIQUIDLEVEL", "STATE")
                this.lastvalue = s[this.lastdataview.getUint8(0)]
            },
            refresh() {
                console.log("Can't refresh push events")
            },
            message() {
                return this.name + ": " + this.lastvalue
            }
        },
        mugcolor: {
            uuid: "fc540014-236c-4c94-8fa9-944a3e5353fa",
            name: "Mug Color",
            lastupdate: 0,
            lastdataview: 0,
            lastvalue: "000000",
            convert() {
                this.lastvalue = dataViewToHexString(this.lastdataview).substring(0, 6)
            },
            refresh() {
                refreshcharacteristic(this)
            },
            message() {
                return this.name + ": #" + this.lastvalue
            },
            write(color) {
                if (color.length == 6) {
                    c = hexToDataView(color + "ff")
                    log("Setting new color: #" + color)
                    writecharacteristic(this, c)
                }
                else
                    log("Weird color: " + color, "error")

            }
        }
    }
};

// let device;
// let server;
let refreshInterval

// Handle Mugname
mugname.addEventListener("input", () => {
    console.log("Change")
    document.getElementById("updatename").style.display = "inline";
})
mugname.addEventListener("keydown", (e) => {
    if (e.keyCode === 13) {
        updatename.style.display = "none"
        mug.attr.name.write(mugname.innerHTML)
        e.preventDefault()
        mugname.blur()
    }
});
updatename.addEventListener("click", (x) => {
    x.target.style.display = "none"
    mug.attr.name.write(mugname.innerHTML)
})

// Handle target temperature
targettemperature.addEventListener("input", () => {
    console.log("Change")
    document.getElementById("updatetarget").style.display = "inline";
})
targettemperature.addEventListener("keydown", (e) => {
    if (e.keyCode === 13) {
        updatetarget.style.display = "none"
        mug.attr.targettemp.write(targettemperature.innerHTML)
        e.preventDefault()
        targettemperature.blur()
        redraw()
    }
});
updatetarget.addEventListener("click", (x) => {
    x.target.style.display = "none"
    mug.attr.targettemp.write(targettemperature.innerHTML)
    redraw()
})

function redraw() {
    document.getElementById("meterfg").style.width = 100 - (((mug.attr.temp.lastvalue - 20) / (100 - 20)) * 100) + "%"
    document.getElementById("meterhandle").style.left = ((mug.attr.targettemp.lastvalue - 20) / (100 - 20)) * 100 + "%"
    document.getElementById("targettemperature").innerHTML = mug.attr.targettemp.lastvalue
    document.getElementById("meterlabel").innerHTML = mug.attr.temp.lastvalue + "°C"
    document.getElementById("filltext").innerHTML = mug.attr.state.lastvalue
    document.getElementById("mugname").innerHTML = mug.attr.name.lastvalue
    document.getElementById("lcolor").style.backgroundColor = "#" + mug.attr.mugcolor.lastvalue;
    document.getElementById("fill").style.height = (mug.attr.liquidlevel.lastvalue * 3) + "%";
    document.getElementById("lightcolor").value = "#" + mug.attr.mugcolor.lastvalue;
    document.getElementById("bat").innerHTML = ((mug.attr.battery.lastvalue > 30) && "🔋" || "🔋⚠️") + (mug.attr.battery.charging && "⚡" || "") + mug.attr.battery.lastvalue + "%";
    //
}

function dataViewToHexString(dataView) {
    return [...new Uint8Array(dataView.buffer)].map(x => x.toString(16).padStart(2, '0')).join("");
}
function hexToDataView(hex) {
    if (hex.length !== 8) {
        console.log('Expected a 4-byte hex string');
    }
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 8; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function refreshall() {
    log("Requesting all characteristics")
    Object.keys(mug.attr).forEach(e => { mug.attr[e].refresh(); })
}
function refreshstats() {
    console.log("refreshing...")
    mug.attr.battery.refresh();
    mug.attr.temp.refresh();
    mug.attr.state.refresh();
    mug.attr.liquidlevel.refresh();
}
function startinterval() {
    try {
        clearInterval(refreshInterval)
    }
    catch { }
    refreshInterval = setInterval(refreshstats, 10000);
}
function myTimer() {
    const date = new Date();
    console.log(date.toLocaleTimeString());
}
async function refreshcharacteristic(a) {
    try {
        service = await server.getPrimaryService(mug.uuid);
        const characteristic = await service.getCharacteristic(a.uuid);
        const value = await characteristic.readValue();
        a.lastdataview = value
        a.lastupdate = Date.now()
        a.convert()
        log(a.message(), "normal")
        redraw()
    }
    catch {
        log("Error while refreshing.", "error")
    }
}

function checkconnection() {
    if (typeof (server) == 'undefined' || server.connected == false) {
        connectButton.style.display = "";
        disconnectButton.style.display = "none";
        document.getElementById("connectionlost").style.display = "";
    } else {
        connectButton.style.display = "none";
        disconnectButton.style.display = "";
        document.getElementById("connectionlost").style.display = "none";
    }

}

async function writecharacteristic(a, value) {
    try {
        if (typeof (server) != "undefined") {
            server.getPrimaryService(mug.uuid)
                .then(service => service.getCharacteristic(a.uuid))
                .then(characteristic => {
                    return characteristic.writeValue(value);
                })
                .then(_ => {
                    log(a.name + " set", "success");
                    refreshcharacteristic(a)
                })
                .catch(error => { console.log(error); log(error.message, "error") });
        }
        else {
            log(`Error: Not connected?`, "error");
        }
    }
    catch (error) {
        console.log(error);
        log(`Error: ${error.message}`, "error");
    }
}

function log(text, color) {
    var color = color || "normal";
    logArea.innerHTML = "<span class='" + color + "'>" + new Date().toLocaleTimeString() + " " + text + "</span><br>" + logArea.innerHTML
}

connectButton.addEventListener("click", async () => {
    try {
        log("Searching UUID" + mug.uuid, "log")
        device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [mug.uuid] },
            ],
        });
        log("Success", "success")
        log("Connecting to GATT Server...", "log")
        server = await device.gatt.connect();
        setTimeout(async () => {
            try {
                refreshall()
                startinterval()
            } catch (error) {
                console.log(error);
                log(`Error: ${error.message}`, "error");
            }
        }, 1000);
    } catch (error) {
        console.log(error);
        log(`Error: ${error.message}`, "error");
    }
});

disconnectButton.addEventListener("click", () => {
    if (server) {
        log("Disconnecting from GATT Server...", "log");
        server.disconnect();
        try {
            clearInterval(refreshInterval)
        }
        catch { }
    }
});
function updatelight() {
    c = document.getElementById("lightcolor").value
    console.log(c.substring(1, 7))
    document.getElementById("lcolor").style.backgroundColor = c
    mug.attr.mugcolor.write(c.substring(1, 7))
}

if (typeof navigator.bluetooth == "undefined")
    log("NO BLUETOOTH? <a href='https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility'>supported browsers</a>", "error")
redraw()
setInterval(checkconnection, 1000); 