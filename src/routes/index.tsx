import { createFileRoute } from '@tanstack/react-router';
import { fetchMyData } from '../server/functions';
import { App } from '../web/App';
import { Landing } from '../web/Landing';

export const Route = createFileRoute('/')({
  loader: () => fetchMyData(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  return data.signedIn ? <App items={data.items} settings={data.settings} publish={data.publish} /> : <Landing />;
}
