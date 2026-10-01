import { defineModule } from '@seiyuu/game-sdk';
import Component from './SeiyuuBingo';
import './styles.css';

/* 模块入口：主站按 `module.json` 的 path 挂载这个组件。 */
export default defineModule(Component);
