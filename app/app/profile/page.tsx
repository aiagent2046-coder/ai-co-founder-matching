export default function ProfilePage() {
  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-5 border-b border-white/[0.07] shrink-0">
        <h1 className="text-2xl font-bold text-white" style={{fontFamily:'serif'}}>Профиль</h1>
        <p className="text-gray-500 text-sm">Твой фаундер-профиль</p>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">👤</div>
          <p className="text-gray-500">Страница профиля — в разработке</p>
        </div>
      </div>
    </div>
  );
}
