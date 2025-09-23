//Access Html Elements into javascript
let loginTab = document.getElementById("loginTab");
let registerTab = document.getElementById("registerTab");
let loginForm = document.getElementById("loginForm");
let registerForm = document.getElementById("registerForm");

//Tab Switch
loginTab.onclick = function(){
  loginTab.classList.add("active");
  registerTab.classList.remove("active");

  loginForm.style.display = "block";
  registerForm.style.display = "none";
};

registerTab.onclick = function(){
  registerTab.classList.add("active");
  loginTab.classList.remove("active");

  registerForm.style.display = "block";
  loginForm.style.display = "none";
};

registerForm.onsubmit = function(event){
  event.preventDefault();

  let fname = document.getElementById("firstName").value;
  let lname = document.getElementById("lastName").value;
  let uname = document.getElementById("username").value;
  let mail = document.getElementById("registerEmail").value;
  let pass = document.getElementById("registerPassword").value;
  let cpass = document.getElementById("confirmPassword").value;

  if(pass !== cpass){
    alert("Passwords do not match");
    return;
  }

  let user ={
    firstName: fname,
    lastName: lname,
    username: uname,
    email: mail,
    password: pass,
  };

  // localStorage me save karna
  localStorage.setItem("user", JSON.stringify(user));

  alert("Registration successful! Please login now.");
  loginTab.onclick(); // Register ke baad login page open ho jayega
};

//Login Form
loginForm.onsubmit = function(event){
  event.preventDefault();

  let id = document.getElementById("loginIdentifier").value.trim();
  let pass = document.getElementById("loginPassword").value;

  let savedUser = JSON.parse(localStorage.getItem("user"));

  if(savedUser &&(savedUser.email === id || savedUser.username === id) &&savedUser.password === pass){
    // Redirect to home page
    window.location.href = "home.html";
  } 
  else{
    alert("Wrong username/email or password!");
  }
};

