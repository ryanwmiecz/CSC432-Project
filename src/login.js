dataDict = {"username": "admin", "password": "admin"}

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
var warning = document.getElementById("warning");

loginButton.addEventListener("click", function() {
    if (document.getElementById("usernameInfo").value == dataDict["username"] && document.getElementById("passwordInfo").value == dataDict["password"]){
        
    } 
    else {
        warning.textContent = "Incorrect username or password";
    }
});

signupButton.addEventListener("click", function() {
    window.location.href = "signup.html";
});



