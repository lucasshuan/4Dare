-- The first news posts: the side menu with the community pages, the
-- Workshop, and the new privacy and terms pages. Inserted once; safe to run
-- again (an id already there stays as it is).

insert into public.news_posts (id, published_at, kind, game, featured, title, body, action)
values
  (
    'side-menu-community',
    now(),
    'new',
    'site',
    true,
    '{"pt": "Menu lateral e páginas da comunidade", "en": "A side menu and community pages", "es": "Menú lateral y páginas de la comunidad", "ja": "サイドメニューとコミュニティのページ"}',
    '{"pt": "O botão à esquerda do logo abre tudo o que existe. Chegaram Personagens, para criar, apelidar e mandar fotos, além de Rankings, Jogadores e Contribuições.", "en": "The button left of the logo opens everything there is. New: Characters, to add, nickname and send pictures, plus Rankings, Players and Contributions.", "es": "El botón a la izquierda del logo abre todo lo que hay. Llegaron Personajes, para crear, poner apodos y subir fotos, además de Clasificación, Jugadores y Contribuciones.", "ja": "ロゴの左のボタンからすべてのページへ。キャラクター（追加・ニックネーム・写真）、ランキング、プレイヤー、貢献のページが登場しました。"}',
    '{"href": "/characters", "label": {"pt": "Ver Personagens", "en": "See Characters", "es": "Ver Personajes", "ja": "キャラクターを見る"}}'
  ),
  (
    'workshop-open',
    now() - interval '1 minute',
    'new',
    'site',
    false,
    '{"pt": "A Oficina abriu", "en": "The Workshop is open", "es": "El Taller abrió", "ja": "工房がオープン"}',
    '{"pt": "Sugira temas, perguntas e missões, vote no que está chegando e veja o que já está no ar. O que entra no jogo aparece aqui, com crédito a quem sugeriu.", "en": "Suggest themes, questions and missions, vote on what is coming and see what is live. What goes into the game shows up here, crediting who suggested it.", "es": "Sugiere temas, preguntas y misiones, vota lo que viene y mira lo que ya está activo. Lo que entra en el juego aparece aquí, con crédito a quien lo sugirió.", "ja": "テーマ・質問・ミッションを提案し、これからのものに投票し、公開中のものを見よう。ゲームに入ったものは、提案者の名前つきでここに載ります。"}',
    '{"href": "/workshop", "label": {"pt": "Abrir a Oficina", "en": "Open the Workshop", "es": "Abrir el Taller", "ja": "工房を開く"}}'
  ),
  (
    'privacy-terms-v1',
    now() - interval '2 minutes',
    'notice',
    'site',
    false,
    '{"pt": "Privacidade e termos novos", "en": "New privacy policy and terms", "es": "Privacidad y términos nuevos", "ja": "プライバシーポリシーと利用規約"}',
    '{"pt": "Textos curtos, com o essencial em 30 segundos no topo. Nada mudou no que guardamos.", "en": "Short texts, with the essentials in 30 seconds at the top. Nothing changed in what we keep.", "es": "Textos cortos, con lo esencial en 30 segundos arriba. No cambió nada de lo que guardamos.", "ja": "短い文章で、要点を30秒で読めるようにしました。保存するデータは変わりません。"}',
    '{"href": "/privacy", "label": {"pt": "Ler o essencial", "en": "Read the essentials", "es": "Leer lo esencial", "ja": "要点を読む"}}'
  )
on conflict (id) do nothing;
