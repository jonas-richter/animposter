import HostScreen from '@/components/HostScreen';

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostScreen code={code.toUpperCase()} />;
}
