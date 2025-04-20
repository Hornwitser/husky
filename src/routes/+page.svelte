<!--
  This is the root page -- This is practically a splash screen.
  Fetch everything out of the database, init anything in the background,
  and then push the user to login/account or login/character
-->

<script lang="ts">
  import { username, password, autoLogin } from "$lib/account";
  import { login } from "$lib/rust";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let usernameValue = $state<string | null>(null);
  let passwordValue = $state<string | null>(null);
  let autoLoginValue = $state(false);

  // Set up store subscriptions
  $effect(() => {
    const unsubUsername = username.subscribe(v => usernameValue = v);
    const unsubPassword = password.subscribe(v => passwordValue = v);
    const unsubAutoLogin = autoLogin.subscribe(v => autoLoginValue = v);
    
    return () => {
      unsubUsername();
      unsubPassword();
      unsubAutoLogin();
    };
  });

  $effect(() => {
    if (autoLoginValue && usernameValue && passwordValue) {
      doLogin();
    }
  });

  async function doLogin() {
    await login(usernameValue!, passwordValue!);
    goto("/characters");
  }

  function oninput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.name === 'username') {
      username.set(input.value);
    } else if (input.name === 'password') {
      password.set(input.value);
    }
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    doLogin();
  }
</script>

<style lang="scss">
  #main {
    position: absolute;
    justify-content: center;
    align-items: center;
    width: 256px;
    height: 100%;
    left: calc(50% - (256px/2));
    gap: 12px;

    h1 {
      font-size: 48px;
      font-weight: 300;
    }

    input {
      box-sizing: border-box;
      background: var(--color-gray-11);
      border: 1px solid var(--color-gray-12);
      border-radius: 4px;

      padding: 8px 12px;
      width: 100%;

      &[type="checkbox"] {
        height: 16px;
        width: 16px;
      }
    }

    #final-row {
      width: 100%;
      justify-content: end;
      align-content: center;
      align-items: center;
      gap: 4px;

      button {
        padding: 6px 12px;
        box-sizing: border-box;
        background: rgba(67, 67, 67, 0.4);
        border: 1px solid var(--color-gray-9);
        border-radius: 4px;
        margin-left: 16px;
      }
    }
  }

  :root {
    background-color: var(--color-gray-10);
  }  
</style>

<div id="main" class="col">
  <h1>Husky</h1>
  <form class="login-form" {onsubmit}>
    <input 
      type="text"
      name="username"
      placeholder="Username"
      value={usernameValue ?? ''}
      {oninput}
    >
    <input 
      type="password"
      name="password"
      placeholder="Password"
      value={passwordValue ?? ''}
      {oninput}
    >
    <div id="final-row" class="row">
      <input 
        type="checkbox" 
        name="auto-login" 
        id="auto-login" 
        checked={autoLoginValue} 
        {oninput}
      >
      <label for="auto-login"> Auto-login </label>
      <button type="submit"> Sign In </button>
    </div>
  </form>
</div>
