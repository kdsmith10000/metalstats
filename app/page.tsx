import Dashboard from '@/components/Dashboard';
import { WarehouseStocksData } from '@/lib/data';
import data from '../public/data.json';

export default function Home() {
  return <Dashboard data={data as WarehouseStocksData} />;
}
