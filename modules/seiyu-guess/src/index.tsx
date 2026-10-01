import { defineModule } from '@seiyuu/game-sdk';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './Home';
import SingleLobby from './SingleLobby';
import SingleGame from './SingleGame';
import MultiLobby from './MultiLobby';
import MultiRoom from './MultiRoom';

/**
 * 声优猜：单人练习与实时多人对战共用一套板子。
 *
 * 模块声明了三个路由前缀（`/seiyu-guess`、`/single`、`/multi`），
 * 主站按最长前缀匹配后把整个子树交给本组件，所以这里用绝对路径写子路由。
 */
function SeiyuGuessModule() {
  return (
    <Routes>
      <Route path="/seiyu-guess" element={<Home />} />
      <Route path="/single" element={<SingleLobby />} />
      <Route path="/single/:mode" element={<SingleGame />} />
      <Route path="/multi" element={<MultiLobby />} />
      <Route path="/multi/room" element={<MultiRoom />} />
      <Route path="*" element={<Navigate to="/seiyu-guess" replace />} />
    </Routes>
  );
}

export default defineModule(SeiyuGuessModule);
