<script lang="ts" module>
  export const iconSizes = {
    small: {
      iconSize: 32,
      statusSize: 8
    },
    large: {
      iconSize: 56,
      statusSize: 12
    }
  } as const;
</script>

<script lang="ts">
  import { getAvatar } from "./util";

  const props = $props<{
    status?: string;
    character: string;
    iconSize?: number;
    statusSize?: number;
  }>();

  const status = props.status ?? "online";
  const character = props.character;
  const iconSize = props.iconSize ?? 32;
  const statusSize = props.statusSize ?? 8;
</script>

<style lang="scss">
  #container {
    position: relative;
    display: block;
    width: var(--icon-size);
    height: var(--icon-size);
    line-height: 0px;

    img {
      border-radius: calc(var(--icon-size) / 8);
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  #status {
    position: absolute;
    right: 0; /*calc(var(--status-size) * -0.15);*/
    bottom: 0; /*calc(var(--status-size) * -0.15);*/
    width: var(--status-size);
    height: var(--status-size);
    border-radius: calc(var(--status-size) / 2) 0 calc(var(--status-size) / 4) 0;
    border-width: calc(var(--status-size) / 4) 0 0 calc(var(--status-size) / 4);
    border-style: solid;
    border-color: var(--color-gray-11);
    box-sizing: border-box;

    &.online {
      background-color: #49aa19;
    }
    &.looking {
      background-color: #49aa19;
    }
    &.away {
      background-color: #d8bd14;
    }
    &.idle {
      @extend .away;
    }
    &.busy {
      background-color: #d87a16;
    }
    &.do_not_disturb {
      background-color: #d32029;
    }
    &.offline {
      background-color: #8c8c8c;
    }
  }
</style>

<div id="container" style="
  --icon-size: {iconSize}px;
  --status-size: {statusSize}px;
">
  <img src={getAvatar(character)} alt={character}>
  <div id="status" class={status}></div>
</div>
