import { defineModule } from '@seiyuu/game-sdk';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sukikirai from './Sukikirai';
import SukikiraiSeiyuu from './SukikiraiSeiyuu';
import './styles.css';

/** 喜欢或讨厌：热度榜 + 单个人物投票页。 */
function SukikiraiModule() {
  return (
    <Routes>
      <Route path="/seiyuu-sukikirai" element={<Sukikirai />} />
      <Route path="/seiyuu-sukikirai/:id" element={<SukikiraiSeiyuu />} />
      <Route path="*" element={<Navigate to="/seiyuu-sukikirai" replace />} />
    </Routes>
  );
}

export default defineModule(SukikiraiModule);
