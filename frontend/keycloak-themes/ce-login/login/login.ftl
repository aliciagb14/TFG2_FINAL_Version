<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=false displayMessage=true displayRequiredFields=false>

<div class="login-container">
  <div class="form-container">
    <div class="logo-background">
      <img src="${url.resourcesPath}/img/logoUPM.png" alt="Logo">
    </div>

    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
      <div class="input-container">
        <input id="username" name="username" type="text" class="input" placeholder="Username" autofocus />
        <input id="password" name="password" type="password" class="input" placeholder="Password" />
      </div>

      <div class="button-container">
        <a class="forgot-link" href="${url.loginResetCredentialsUrl}">Forgot your password?</a>
        <input type="submit" class="login-button" value="Login" />
      </div>
    </form>
  </div>

  <div class="powered-footer">
    <img src="${url.resourcesPath}/img/footerUPM.png" alt="Powered">
  </div>
</div>

</@layout.registrationLayout>
