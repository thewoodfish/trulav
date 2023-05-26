
function ce(tag) {
    return document.createElement(tag);
}

function qs(val) {
    return document.querySelector(val);
}

function qsa(val) {
    return document.querySelectorAll(val);
}

function clearField(attr) {
    qs(attr).value = "";
}

function signal(message) {
    // create the alert element
    var alert = document.createElement("div");
    alert.classList.add("signal");
    alert.textContent = message;

    // add the alert element to the document
    document.body.appendChild(alert);
    alert.scrollIntoView(false);

    // set a timeout to remove the alert element after 5 seconds
    setTimeout(function () {
        alert.classList.add("signal-off");
        setTimeout(function () {
            document.body.removeChild(alert);
        }, 500);
    }, 1000);
}

document.body.addEventListener("click", (e) => {
    e = e.target;
    if (e.classList.contains("signup-btn")) {
        let values = [];
        [].forEach.call(qsa(".reg-form"), (f) => {
            if (f.firstElementChild.value)
                values.push(f.firstElementChild.value);
        });

        if (values.length) {
            // send request to server
            fetch("/signup", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values
                })
            })
                .then(async res => {
                    await res.json().then(res => {
                        if (res.error) {
                            signal(res.data);
                        } else {
                            // save the did to session
                            sessionStorage["sess_user"] = res.data.did;
                            signal("Welcome to the TruLav Dating Centre");
                            setTimeout(() => {
                                window.location = "/";
                            }, 2000);
                        }
                    });
                })
        } else
            signal("Please fill in all input details");
    } else if (e.classList.contains("login-btn")) {
        let values = [];
        [].forEach.call(qsa(".login-form"), (f) => {
            if (f.firstElementChild.value)
                values.push(f.firstElementChild.value);
        });

        if (values.length) {
            // send request to server
            fetch("/signin", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values
                })
            })
                .then(async res => {
                    await res.json().then(res => {
                        if (res.error) {
                            signal(res.data);
                        } else {
                            // save the did to session
                            sessionStorage["sess_user"] = res.data.did;
                            signal("Welcome to the TruLav Dating Centre");
                            setTimeout(() => {
                                window.location = "/";
                            }, 2000);
                        }
                    });
                })
        } else
            signal("Please fill in all input details");
    } else if (e.classList.contains("profile-update-btn")) {
        let values = [];
        [].forEach.call(qsa(".profile-form"), (f) => {
            if (f.firstElementChild.value)
                values.push(f.firstElementChild.value);
        });

        if (values.length) {
            let keys = ["name", "username", "email", "telephone", "address", "country"];
            // send request to server
            fetch("/update-profile", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: Object.fromEntries(keys.map((key, index) => [key, values[index]]))
                })
            })
                .then(async res => {
                    await res.json().then(res => {
                        signal(res.data);
                    });
                })
        } else
            signal("Please fill in all input details");
    }
}, false);
