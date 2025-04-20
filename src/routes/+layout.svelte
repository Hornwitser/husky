<script lang="ts">
  import "../app.css";

  const { children } = $props();
</script>

<main class="container">
  {@render children()}
</main>
