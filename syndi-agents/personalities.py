"""
Банк персоналей для 100 AI агентов SyndiAI.
Все данные сгенерированы для демонстрационных целей.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any


# ── Имена ────────────────────────────────────────────────────────────────────

MALE_FIRST_NAMES = [
    "Artem", "Bogdan", "Vladimir", "Dmitry", "Egor", "Ivan", "Kirill",
    "Leonid", "Maxim", "Nikita", "Oleg", "Pavel", "Roman", "Sergey",
    "Timur", "Fedor", "Yuri", "Alexander", "Andrey", "Anton", "Boris",
    "Vadim", "Gleb", "Denis", "Ilya", "Konstantin", "Mikhail", "Stanislav",
    "Yaroslav", "Alexey", "German", "David", "Daniel", "Tikhon", "Platon",
    "Mark", "Lev", "Adam", "Samir", "Said", "Askhab",
]

FEMALE_FIRST_NAMES = [
    "Anastasia", "Victoria", "Daria", "Ekaterina", "Alina", "Anna",
    "Maria", "Olga", "Polina", "Sofia", "Tatiana", "Yulia", "Elena",
    "Irina", "Natalia", "Svetlana", "Valeria", "Veronika", "Mila",
    "Zarina", "Amina", "Karina", "Kristina", "Margarita", "Olesya",
    "Rina", "Liana", "Madina", "Kamilla", "Elina",
]

LAST_NAMES = [
    "Volkov", "Kozlov", "Novikov", "Morozov", "Petrov", "Sokolov",
    "Vasilyev", "Kuznetsov", "Smirnov", "Popov", "Lebedev", "Kuzmin",
    "Semyonov", "Pavlov", "Stepanov", "Orlov", "Nikitin", "Makarov",
    "Zakharov", "Zaytsev", "Solovyov", "Borisov", "Yakovlev", "Gusev",
    "Grigoryev", "Vinogradov", "Bogdanov", "Fedorov", "Ponomarev",
    "Mikhailov", "Tikhonov", "Frolov", "Kalin", "Antonov", "Efimov",
    "Komarov", "Davydov", "Melnikov", "Shcherbakov", "Blokhin",
    "Kolesnikov", "Petrenko", "Martynov", "Golovin", "Abramov",
    "Akhmedov", "Ismailov", "Kadyrov", "Magomedov", "Dzhalilov",
]

# ── Роли ─────────────────────────────────────────────────────────────────────

ROLES = [
    "CTO", "CEO", "CPO", "VP of Engineering", "Head of Product",
    "Tech Lead", "Full-Stack Developer", "ML Engineer", "Data Scientist",
    "DevOps Engineer", "Backend Developer", "Frontend Developer",
    "Mobile Developer", "Blockchain Developer", "Security Engineer",
    "Growth Hacker", "Product Manager", "UX Designer", "Data Engineer",
    "Research Scientist", "Solutions Architect", "Platform Engineer",
    "AI Researcher", "NLP Engineer", "Computer Vision Engineer",
]

# ── Домены ───────────────────────────────────────────────────────────────────

DOMAINS = [
    "Fintech", "HealthTech", "EdTech", "E-commerce", "SaaS", "AI/ML",
    "Cybersecurity", "IoT", "CleanTech", "AgriTech", "PropTech",
    "LegalTech", "MarTech", "Gaming", "Social Media", "Mobility",
    "FoodTech", "SpaceTech", "BioTech", "RetailTech", "InsurTech",
    "HR Tech", "Real Estate", "Logistics", "Energy",
]

# ── Локации ──────────────────────────────────────────────────────────────────

LOCATIONS = [
    "Moscow", "Saint Petersburg", "Kazan", "Novosibirsk", "Yekaterinburg",
    "Innopolis", "Dubai", "Tbilisi", "Almaty", "Minsk", "Tashkent",
    "Baku", "Warsaw", "Berlin", "Lisbon", "Istanbul", "Bangkok",
    "Ho Chi Minh", "Jakarta", "Nairobi", "Lagos", "Mexico City",
    "Sao Paulo", "Buenos Aires", "Austin", "San Francisco", "Toronto",
    "London", "Singapore", "Bangalore", "Tel Aviv", "Seoul",
    "Tokyo", "Sydney", "Helsinki", "Riga", "Prague",
]

# ── Стадии стартапа ──────────────────────────────────────────────────────────

STAGES = ["idea", "mvp", "traction", "scaling", "revenue"]

# ── Скиллы ───────────────────────────────────────────────────────────────────

TECH_SKILLS = [
    "React", "TypeScript", "Node.js", "Python", "Go", "Rust", "Kotlin",
    "Swift", "Flutter", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "PostgreSQL", "MongoDB", "Redis", "Kafka", "Elasticsearch",
    "TensorFlow", "PyTorch", "LangChain", "OpenAI API", "GraphQL",
    "gRPC", "WebSocket", "Microservices", "CI/CD", "Terraform",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "Data Engineering", "MLOps", "Product Analytics", "Growth",
    "React Native", "Next.js", "FastAPI", "Django", "Spring Boot",
    "Ethereum", "Solidity", "Zero-Knowledge Proofs", "Cybersecurity",
    "Penetration Testing", "Mobile UI/UX", "Design Systems", "Figma",
    "User Research", "A/B Testing", "SEO", "Content Marketing",
    "Sales", "Fundraising", "Pitch Decks", "Financial Modeling",
    "Community Building", "DevRel", "Technical Writing", "System Design",
    "Edge Computing", "WebAssembly", "Serverless", "Event Sourcing",
    "CQRS", "DDD", "Clean Architecture", "OAuth", "OIDC",
]

BUSINESS_SKILLS = [
    "Business Development", "Partnerships", "Sales", "Marketing",
    "Product Strategy", "Roadmapping", "User Research", "Analytics",
    "Growth Hacking", "Content Strategy", "Community", "Fundraising",
    "Financial Modeling", "Legal", "IP Strategy", "Negotiation",
    "Team Building", "Recruiting", "OKRs", "Agile", "Scrum",
    "Customer Development", "Lean Startup", "Pricing Strategy",
    "GTM Strategy", "Brand Strategy", "Public Relations", "Storytelling",
    "Pitching", "Investor Relations", "Compliance", "Tax Planning",
    "Market Research", "Competitive Analysis", "Revenue Operations",
    "Customer Success", "Support", "Documentation", "DevRel",
    "Government Relations", "ESG", "Sustainability", "Impact Measurement",
    "Strategic Planning", "M&A", "Due Diligence", "Term Sheets",
    "Cap Table", "Vesting", "Board Management", "Advisory",
]

CREATIVE_SKILLS = [
    "UI Design", "UX Design", "Motion Design", "3D Modeling",
    "Illustration", "Video Production", "Photography", "Copywriting",
    "Brand Design", "Design Systems", "Prototyping", "Wireframing",
    "User Testing", "Information Architecture", "Accessibility",
    "Creative Direction", "Art Direction", "Typography", "Color Theory",
    "Interaction Design", "Animation", "Sound Design", "Game Design",
    "Level Design", "Narrative Design", "Character Design",
]

ALL_SKILLS = TECH_SKILLS + BUSINESS_SKILLS + CREATIVE_SKILLS

# ── Стартап-идеи (100 штук) ─────────────────────────────────────────────────

STARTUP_IDEAS = [
    # AI/ML (1-15)
    {"title": "MediScan AI", "domain": "HealthTech",
     "pitch": "AI-диагностика по фото кожи с 95%+ accuracy. Мобильное приложение + API для клиник. Целевой рынок $12B dermoscopy."},
    {"title": "LegalFlow", "domain": "LegalTech",
     "pitch": "Автоматическая генерация юридических документов для SMB. NDA, соглашения, контракты за 30 секунд."},
    {"title": "FarmPredict", "domain": "AgriTech",
     "pitch": "Прогноз урожайности по спутниковым снимкам + IoT датчики. Помогаем фермерам оптимизировать полив и удобрения."},
    {"title": "EduCompanion", "domain": "EdTech",
     "pitch": "AI-репетитор, персонализирующий обучение по школьной программе. Адаптивные квизы + объяснения на уровне ученика."},
    {"title": "CarbonTrack", "domain": "CleanTech",
     "pitch": "Платформа для отслеживания и торговли carbon credits для SMB. Интеграция с ERP, автоматический расчёт footprint."},
    {"title": "CryptoGuard", "domain": "Cybersecurity",
     "pitch": "Реалтайм мониторинг крипто-кошельков на предмет угроз. ML-детекция фишинга и rug pulls."},
    {"title": "VoiceForm", "domain": "SaaS",
     "pitch": "Голосовые формы для сбора данных. Пользователь говорит — AI структурирует. Идеально для полевых работников."},
    {"title": "RentScore", "domain": "PropTech",
     "pitch": "AI-скоринг арендаторов для владельцев недвижимости. Анализ соцсетей, кредитной истории, references."},
    {"title": "FitGenome", "domain": "HealthTech",
     "pitch": "Персонализированные фитнес-планы на основе генетических тестов + wearables data. Precision wellness."},
    {"title": "ChainVerify", "domain": "Blockchain",
     "pitch": "Верификация подлинности товаров через NFT. Сканируешь QR — видишь всю историю продукта."},
    {"title": "NewsBrief", "domain": "AI/ML",
     "pitch": "AI-редактор, который создаёт персонализированные дайджесты новостей. Без шума, только релевантное."},
    {"title": "CodeMentor AI", "domain": "EdTech",
     "pitch": "AI-ментор для junior-разработчиков. Code review, объяснение ошибок, карьерный рост."},
    {"title": "DocuMind", "domain": "AI/ML",
     "pitch": "AI-поиск по корпоративным документам. Понимает контекст, отвечает вопросами, находит клаузулы."},
    {"title": "SupplyBrain", "domain": "Logistics",
     "pitch": "Оптимизация цепочек поставок через reinforcement learning. Прогноз спроса, маршрутизация, инвентарь."},
    {"title": "RecruitIQ", "domain": "HR Tech",
     "pitch": "AI-скрининг резюме без bias. Анализирует skills match, а не ключевые слова. Diversity-first."},

    # Fintech (16-25)
    {"title": "SplitWise Business", "domain": "Fintech",
     "pitch": "Корпоративный сплит расходов для команд. Интеграция с корп. картами, автоматический учёт."},
    {"title": "MicroInsure", "domain": "InsurTech",
     "pitch": "Микрострахование через API. Интегрируется в любой сервис — путешествия, доставка, здоровье."},
    {"title": "TaxBot", "domain": "Fintech",
     "pitch": "Автоматический налоговый помощник для фрилансеров. Отслеживает доходы, считает налоги, подсказывает вычеты."},
    {"title": "P2PLend", "domain": "Fintech",
     "pitch": "P2P кредитование с AI-скорингом. Обход традиционных банков, доступность в emerging markets."},
    {"title": "PayStream", "domain": "Fintech",
     "pitch": "Потоковые платежи в реальном времени. Зарплата каждую секунду, а не раз в месяц."},
    {"title": "CryptoPayroll", "domain": "Fintech",
     "pitch": "Зарплата в криптовалюте для remote-команд. Комплаенс, налоги, конвертация — всё автоматически."},
    {"title": "RoundUp", "domain": "Fintech",
     "pitch": "Округление покупок до целого и инвестирование разницы. Микроинвестиции для каждого."},
    {"title": "InvoiceFlow", "domain": "Fintech",
     "pitch": "Факторинговая платформа для SMB. Продай счёт и получи деньги сегодня, а не через 90 дней."},
    {"title": "WealthGarden", "domain": "Fintech",
     "pitch": "AI-финансовый советник для emerging markets. Инвестиции с $1, локализованные рекомендации."},
    {"title": "EscrowX", "domain": "Fintech",
     "pitch": "Децентрализованный escrow для сделок. Смарт-контракты вместо юристов для $10K-$500K транзакций."},

    # Social / Consumer (26-35)
    {"title": "BuddyUp", "domain": "Social Media",
     "pitch": "Нетворкинг для релокантов. Найди друзей, коворкинг, жильё в новой стране. AI-matching по интересам."},
    {"title": "SkillSwap", "domain": "EdTech",
     "pitch": "Бартер навыками. Обучайся у экспертов, обучай взамен. Без денег, на основе репутации."},
    {"title": "PetHealth", "domain": "HealthTech",
     "pitch": "Телемедицина для домашних животных. Видеоконсультации с ветеринарами, AI-диагностика."},
    {"title": "EventGenie", "domain": "MarTech",
     "pitch": "AI-планировщик мероприятий. От идеи до execution — вендоры, бюджет, timeline, приглашения."},
    {"title": "MindfulMinutes", "domain": "HealthTech",
     "pitch": "Micro-медитации для корпоративных сотрудников. 2-5 минут между встречами. Интеграция с календарём."},
    {"title": "CookTogether", "domain": "FoodTech",
     "pitch": "Виртуальные кулинарные вечера. Готовь рецепт с людьми по всему миру. Social + Food."},
    {"title": "LanguageBuddy", "domain": "EdTech",
     "pitch": "Практика языков через AI-ролевые игры. Разговорный клуб 24/7 с AI-носителем."},
    {"title": "HobbyCircle", "domain": "Social Media",
     "pitch": "Платформа для поиска единомышленников по хобби. 3D-карта локальных сообществ."},
    {"title": "ParentPod", "domain": "Social Media",
     "pitch": "Сообщество родителей. Советы, бартер нянь, playdate matching. AI-модерация."},
    {"title": "VolunteerMatch", "domain": "Social Media",
     "pitch": "Matching волонтёров и NGO. AI-подбор проектов по skills, локации, availability."},

    # Deep Tech / Infrastructure (36-50)
    {"title": "EdgeML", "domain": "AI/ML",
     "pitch": "ML inference на edge-устройствах. Запускай ML модели на Raspberry Pi без облака."},
    {"title": "QuantumSim", "domain": "AI/ML",
     "pitch": "Симулятор квантовых вычислений для обучения. Интерактивные уроки, визуализация."},
    {"title": "SatNet", "domain": "SpaceTech",
     "pitch": "API для спутниковых данных. NDVI, weather, change detection — всё через REST API."},
    {"title": "MeshGrid", "domain": "Energy",
     "pitch": "Децентрализованная энергосеть. P2P торговля солнечной энергией между соседями."},
    {"title": "NanoSensor", "domain": "IoT",
     "pitch": "Дешёвые IoT датчики для умного города. Air quality, noise, traffic — $5 за узел."},
    {"title": "BioCompute", "domain": "BioTech",
     "pitch": "Cloud platform для биоинформатики. Запускай анализ ДНК без настройки инфраструктуры."},
    {"title": "NeuralChip", "domain": "AI/ML",
     "pitch": "SDK для программирования neuromorphic чипов. Энергоэффективный AI для embedded."},
    {"title": "ZeroTrustX", "domain": "Cybersecurity",
     "pitch": "Zero Trust архитектура as a service. Автоматическая сегментация сети, continuous auth."},
    {"title": "DataMesh", "domain": "Data Engineering",
     "pitch": "Data mesh платформа для enterprise. Децентрализованное управление данными."},
    {"title": "ServerlessDB", "domain": "SaaS",
     "pitch": "База данных, которая масштабируется до нуля. Платишь только за реальные запросы."},
    {"title": "IdentityX", "domain": "Cybersecurity",
     "pitch": "Децентрализованная идентичность (DID). Один цифровой паспорт для всех сервисов."},
    {"title": "DroneFleet", "domain": "IoT",
     "pitch": "Управление fleets дронов. Маршрутизация, обслуживание, compliance — всё в одном."},
    {"title": "ARManual", "domain": "IoT",
     "pitch": "AR-инструкции для промышленного оборудования. Наложи инструкцию на реальный механизм."},
    {"title": "SyntheticData", "domain": "AI/ML",
     "pitch": "Генерация синтетических данных для ML. Privacy-compliant training data on demand."},
    {"title": "AutoScale", "domain": "SaaS",
     "pitch": "Intelligent auto-scaling для Kubernetes. Прогнозирует нагрузку, экономит до 60% на облаке."},

    # Gaming / Entertainment (51-60)
    {"title": "GamerGuild", "domain": "Gaming",
     "pitch": "Платформа для киберспортивных команд. Скаутинг, аналитика, тренировки, турниры."},
    {"title": "MusicCollab", "domain": "Gaming",
     "pitch": "Коллаборативная музыкальная студия в браузере. Ремикси с AI, работай с битмейкерами."},
    {"title": "StoryForge", "domain": "Gaming",
     "pitch": "AI-генератор интерактивных историй. Каждый выбор влияет на сюжет — бесконечные replay."},
    {"title": "FitQuest", "domain": "Gaming",
     "pitch": "RPG, где прогресс зависит от реальных тренировок. Ходьба = золото, бег = XP."},
    {"title": "VirtualConcert", "domain": "Gaming",
     "pitch": "Платформа для виртуальных концертов. AI-аватары артистов, социальные миры."},
    {"title": "TriviaKing", "domain": "Gaming",
     "pitch": "AI-генерируемые trivia по любой теме. Участвуй в турнирах, создавай свои викторины."},
    {"title": "BoardGameAI", "domain": "Gaming",
     "pitch": "AI-соперник для настольных игр. Играй в шахматы, го, catan с адаптивным AI."},
    {"title": "PodcastStudio", "domain": "Gaming",
     "pitch": "Автоматическая студия для подкастеров. AI-звукорежиссёр, шумоподавление, монтаж."},
    {"title": "ClipCreator", "domain": "Social Media",
     "pitch": "AI-генерация short-form видео из long-form контента. Автоматические клипы из подкастов."},
    {"title": "DanceAR", "domain": "Gaming",
     "pitch": "AR-учитель танцев. Наложи виртуального инструктора на своё отражение."},

    # Mobility / Logistics (61-70)
    {"title": "ParkFind", "domain": "Mobility",
     "pitch": "AI-поиск парковки в реальном времени. Интеграция с датчиками, оплата через app."},
    {"title": "FleetOS", "domain": "Mobility",
     "pitch": "OS для управления fleets. Оптимизация маршрутов, maintenance, водители."},
    {"title": "CargoMatch", "domain": "Logistics",
     "pitch": "Uber для грузоперевозок. Matching грузов и водителей, tracking, документы."},
    {"title": "EVRoute", "domain": "Mobility",
     "pitch": "Оптимальный маршрут для электромобилей с учётом зарядных станций."},
    {"title": "BikeShare 2.0", "domain": "Mobility",
     "pitch": "Децентрализованный bike-sharing. Любой велосипед через app, блокчейн-оплата."},
    {"title": "ScooterAI", "domain": "Mobility",
     "pitch": "Autonomous scooters для campus. Self-driving от точки А до Б, dockless."},
    {"title": "PortFlow", "domain": "Logistics",
     "pitch": "Оптимизация портовых операций. AI-планирование погрузки, customs, tracking."},
    {"title": "AeroTrack", "domain": "Logistics",
     "pitch": "Real-time tracking cargo самолётов. Прогноз задержек, автоматические оповещения."},
    {"title": "RailSync", "domain": "Mobility",
     "pitch": "AI-оптимизация железнодорожных расписаний. Меньше задержек, лучше connections."},
    {"title": "DroneDelivery", "domain": "Logistics",
     "pitch": "Последняя миля доставки дронами. Автоматические маршруты, weather-aware."},

    # Retail / E-commerce (71-80)
    {"title": "SmartShelf", "domain": "RetailTech",
     "pitch": "Умные полки с компьютерным зрением. Автоматический инвентарь, обнаружение пустот."},
    {"title": "FitRoom", "domain": "E-commerce",
     "pitch": "Виртуальная примерочная. AR-примерка одежды по фото тела."},
    {"title": "PricePulse", "domain": "E-commerce",
     "pitch": "AI-динамическое ценообразование для retailers. Анализ конкурентов, спроса, сезона."},
    {"title": "LocalMart", "domain": "E-commerce",
     "pitch": "Marketplace для локальных производителей. Farm-to-table через same-day delivery."},
    {"title": "GiftGenie", "domain": "E-commerce",
     "pitch": "AI-подбор подарков. Анализ соцсетей получателя, бюджет, повод."},
    {"title": "RepairHub", "domain": "RetailTech",
     "pitch": "Платформа для ремонта электроники. Matching клиентов и мастеров, гарантии."},
    {"title": "SubBox AI", "domain": "E-commerce",
     "pitch": "AI-персонализация subscription boxes. Каждый box уникален на основе предпочтений."},
    {"title": "TryBeforeBuy", "domain": "E-commerce",
     "pitch": "Home try-on для всего. Доставка на примерку, возврат без вопросов."},
    {"title": "VendorIQ", "domain": "RetailTech",
     "pitch": "AI-менеджмент поставщиков. Прогноз рисков, оптимизация заказов, compliance."},
    {"title": "FlashCart", "domain": "E-commerce",
     "pitch": "10-minute delivery для groceries. Dark stores + оптимизированная логистика."},

    # Emerging Markets / Social Impact (81-90)
    {"title": "TeleHealth Africa", "domain": "HealthTech",
     "pitch": "Телемедицина для rural Africa. SMS + voice diagnosis, connection к врачам."},
    {"title": "MicroGrid", "domain": "Energy",
     "pitch": "Микросети для off-grid деревень. Solar + storage + smart distribution."},
    {"title": "AgriSMS", "domain": "AgriTech",
     "pitch": "Советы фермерам через SMS. Weather alerts, цены на рынке, best practices."},
    {"title": "EduRadio", "domain": "EdTech",
     "pitch": "Образовательный контент через FM-радио + SMS-квизы. Не требует интернета."},
    {"title": "WaterMap", "domain": "CleanTech",
     "pitch": "Карта качества воды с IoT датчиков. Alert при загрязнении, API для governments."},
    {"title": "TradeBridge", "domain": "Fintech",
     "pitch": "Cross-border trade finance для SMB в Africa/Asia. Letters of credit через blockchain."},
    {"title": "HealthID", "domain": "HealthTech",
     "pitch": "Portable health record для развивающихся стран. QR-код = вся история."},
    {"title": "SmartClass", "domain": "EdTech",
     "pitch": "Offline-first LMS для школ без интернета. Синхронизация при наличии связи."},
    {"title": "FairWage", "domain": "HR Tech",
     "pitch": "Прозрачная оплата труда для garment workers. Blockchain tracking, instant payout."},
    {"title": "CropShield", "domain": "AgriTech",
     "pitch": "Crop insurance на основе спутниковых данных. Автоматические выплаты при засухе."},

    # B2B SaaS (91-100)
    {"title": "APIHub", "domain": "SaaS",
     "pitch": "Unified API gateway для SMB. Подключай Stripe, SendGrid, Slack через один интерфейс."},
    {"title": "ContractAI", "domain": "SaaS",
     "pitch": "AI-анализ контрактов. Выявляет риски, сравнивает с шаблонами, tracks deadlines."},
    {"title": "SprintFlow", "domain": "SaaS",
     "pitch": "AI-facilitated agile ceremonies. Автоматические standups, retros, estimations."},
    {"title": "BackupX", "domain": "SaaS",
     "pitch": "Immutable backups для cloud. Защита от ransomware, accidental deletes."},
    {"title": "AccessHub", "domain": "SaaS",
     "pitch": "Unified access management. One login для всех SaaS, automatic offboarding."},
    {"title": "CostOptimize", "domain": "SaaS",
     "pitch": "Оптимизация облачных расходов. Находит waste, recommends reserved instances."},
    {"title": "ComplianceOS", "domain": "SaaS",
     "pitch": "Автоматизированный compliance. SOC2, GDPR, HIPAA — continuous monitoring."},
    {"title": "ObservabilityX", "domain": "SaaS",
     "pitch": "Unified observability. Metrics, logs, traces — без настройки 10 инструментов."},
    {"title": "FeedbackLoop", "domain": "SaaS",
     "pitch": "AI-анализ customer feedback. Сентимент, темы, actionable insights из NPS."},
    {"title": "LaunchPad", "domain": "SaaS",
     "pitch": "No-code launch page + waitlist. AI-copy, A/B testing, viral referrals."},
]

# ── OCEAN архетипы ───────────────────────────────────────────────────────────

OCEAN_ARCHETYPES = [
    # name, (O, C, E, A, N)
    ("Visionary Explorer",   (85, 45, 75, 60, 65)),  # High openness, creative risk-taker
    ("Methodical Builder",   (50, 92, 45, 70, 35)),  # High conscientiousness, reliable
    ("Charismatic Leader",   (70, 65, 90, 75, 40)),  # High extraversion, inspires
    ("Empathetic Connector", (65, 60, 55, 92, 45)),  # High agreeableness, mediator
    ("Analytical Strategist",(80, 85, 40, 55, 30)),  # Low neuroticism, calm thinker
    ("Bold Hustler",         (60, 55, 95, 45, 70)),  # High extraversion, aggressive
    ("Deep Thinker",         (90, 70, 25, 65, 50)),  # High openness, introvert
    ("Steady Operator",      (40, 88, 50, 80, 25)),  # Low neuroticism, stable
    ("Creative Rebel",       (95, 30, 70, 50, 75)),  # Chaotic creative, high neuroticism
    ("Social Architect",     (75, 60, 85, 85, 35)),  # Builds communities
    ("Precision Engineer",   (55, 95, 45, 60, 30)),  # Perfectionist, detail-oriented
    ("People Whisperer",     (60, 50, 75, 95, 40)),  # HR, sales, relationship master
    ("Data Sage",            (85, 90, 35, 50, 25)),  # Research, ML, introvert genius
    ("Growth Machine",       (70, 75, 90, 55, 50)),  # Growth, marketing, sales
    ("Artistic Soul",        (92, 40, 60, 70, 60)),  # Designer, creative, emotional
]

# ── Био шаблоны ──────────────────────────────────────────────────────────────

BIO_TEMPLATES = [
    "Former {{former_role}} at {{former_company}}. Now building {{title}} — {{pitch_short}}. Obsessed with {{obsession}}. Looking for a {{looking_role}} to complement my {{my_strength}}.",
    "{{role}} with {{years}}+ years in {{domain}}. Ex-{{former_company}}. Building {{title}}: {{pitch_short}}. Strong in {{skill1}}, need help with {{skill2}}.",
    "Serial entrepreneur. Previously founded {{former_company}} ({{achievement}}). Now: {{title}} — {{pitch_short}}. Seeking {{looking_role}} co-founder.",
    "Engineer turned founder. Deep expertise in {{domain}}, published research on {{topic}}. Building {{title}} to solve {{problem}}. Need business mind.",
    "Product leader from {{former_company}}. Launched {{product}} with {{metric}}. Now building {{title}}. Looking for technical co-founder who gets {{domain}}.",
    "Ex-{{former_company}} {{role}}. Bootstrapped {{former_project}} to ${{revenue}}/month. Now: {{title}} — {{pitch_short}}. Need growth partner.",
    "Academic background in {{field}}, {{degree}} from {{university}}. Spent {{years}} years at {{former_company}}. Building {{title}}. Seeking {{looking_role}}.",
    "Open source contributor ({{project}} — {{stars}} stars). {{role}} by day, founder by night. {{title}}: {{pitch_short}}. Looking for business co-founder.",
    "Second-time founder. First exit: {{former_company}} (acquired). Domain expert in {{domain}}. Building {{title}}. Need technical co-founder.",
    "Former {{former_role}} at {{former_company}}. {{achievement}}. Passionate about {{domain}}. Building {{title}} — {{pitch_short}}. Need design/tech partner.",
]

# ── Что ищут / чего не ищут ─────────────────────────────────────────────────

LOOKING_FOR_OPTIONS = [
    "co-founder", " CTO", " CEO", " business partner", " technical co-founder",
    " growth partner", " design co-founder", " advisor", " first hire",
    " angel investor", " seed funding", " beta testers", " enterprise clients",
    " distributor partners", " integration partners", " research collaborator",
    " domain expert", " regulatory advisor", " sales co-founder",
]

NOT_LOOKING_FOR_OPTIONS = [
    "employees", " contractors", " consultants only", " remote-only workers",
    " investors who want control", " part-time partners", " non-technical co-founders",
    " idea people without execution", " quick flippers", " non-committed partners",
    " stealth mode perfectionists", " solo operators", " large teams pre-product",
]

# ── Таймлайны и коммитмент ──────────────────────────────────────────────────

TIMELINES = ["1-month", "3-months", "6-months", "1-year", "2-years"]
COMMITMENTS = ["full-time", "part-time", "nights-weekends", "flexible"]
SEEKING_TYPES = ["co-founder", "first-hires", "advisors", "investors"]

# ── Университеты ─────────────────────────────────────────────────────────────

UNIVERSITIES = [
    "Stanford", "MIT", "Berkeley", "Harvard", "Y Combinator",
    "Tsinghua", "IIT Bombay", "TU Munich", "EPFL", "Imperial College",
    "Moscow State", "SPbSU", "Innopolis University", "Skoltech",
    "Kazan Federal", "HSE Moscow", "MEPhI", "MIPT", "ITMO",
    "Waterloo", "Toronto", "Technion", "SNU", "NUS",
]

# ── Бывшие компании ─────────────────────────────────────────────────────────

FORMER_COMPANIES = [
    "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix", "Spotify",
    "Uber", "Airbnb", "Stripe", "Shopify", "Coinbase", "Robinhood",
    "Yandex", "VK", "SberTech", "Tinkoff", "Ozon", "Wildberries",
    "Kaspersky", "JetBrains", "DeepMind", "OpenAI", "Anthropic",
    "Cohere", "Hugging Face", "Scale AI", "Databricks", "Snowflake",
    "Twilio", "Datadog", "Elastic", "MongoDB Inc", "Elastic",
    "Palantir", "Databricks", "Confluent", "Figma", "Notion",
    "Linear", "Vercel", "Supabase", "Prisma", "Tailwind Labs",
    "Binance", "Kraken", "Chainalysis", "Fireblocks", "Ledger",
    "TransferGo", "Revolut", "Wise", "Plaid", "Marqeta",
    "Gojek", "Grab", "Bytedance", "Alibaba", "Tencent",
    " Delivery Hero", "Bolt", "Cabify", "Rappi", "Mercado Libre",
    "Booking.com", "Hopper", "Duolingo", "Coursera", "Khan Academy",
    "Renaissance", "Two Sigma", "Citadel", "Jane Street", "Optiver",
    "Boston Dynamics", "Anduril", "SpaceX", "Blue Origin", "Planet Labs",
    "Canva", "Atlassian", "Slack (Salesforce)", "Airtable", "Asana",
    "Monday.com", "ClickUp", "Notion", "Miro", "Figma",
]


# ── Фабрика персоналий ──────────────────────────────────────────────────────

def make_founder(index: int) -> dict[str, Any]:
    """Создаёт одного уникального founder-агента."""
    random.seed(index * 7919)  # детерминированный, но распределённый

    idea = STARTUP_IDEAS[index % len(STARTUP_IDEAS)]
    archetype = OCEAN_ARCHETYPES[index % len(OCEAN_ARCHETYPES)]
    first_name = (MALE_FIRST_NAMES + FEMALE_FIRST_NAMES)[index % (len(MALE_FIRST_NAMES) + len(FEMALE_FIRST_NAMES))]
    last_name = LAST_NAMES[index % len(LAST_NAMES)]
    name = f"{first_name} {last_name}"
    role = ROLES[index % len(ROLES)]
    domain = idea["domain"]
    location = LOCATIONS[index % len(LOCATIONS)]
    stage = STAGES[index % len(STAGES)]

    # Big Five с вариацией ±10
    ocean_base = archetype[1]
    big_five = {
        "openness":        max(5,  min(95, ocean_base[0] + random.randint(-10, 10))),
        "conscientiousness": max(5,  min(95, ocean_base[1] + random.randint(-10, 10))),
        "extraversion":    max(5,  min(95, ocean_base[2] + random.randint(-10, 10))),
        "agreeableness":   max(5,  min(95, ocean_base[3] + random.randint(-10, 10))),
        "neuroticism":     max(5,  min(95, ocean_base[4] + random.randint(-10, 10))),
    }

    # Скиллы: 5-12 случайных из релевантных категорий
    if "CTO" in role or "Engineer" in role or "Developer" in role:
        skill_pool = TECH_SKILLS + random.sample(BUSINESS_SKILLS, 5)
    elif "CEO" in role or "Product" in role or "Growth" in role:
        skill_pool = BUSINESS_SKILLS + random.sample(TECH_SKILLS, 5)
    elif "Designer" in role or "Creative" in role:
        skill_pool = CREATIVE_SKILLS + random.sample(BUSINESS_SKILLS, 3) + random.sample(TECH_SKILLS, 3)
    else:
        skill_pool = ALL_SKILLS
    skills = random.sample(skill_pool, min(random.randint(5, 12), len(skill_pool)))

    # Bio
    template = BIO_TEMPLATES[index % len(BIO_TEMPLATES)]
    bio = template.replace("{{title}}", idea["title"]) \
                  .replace("{{pitch_short}}", idea["pitch"].split(".")[0] + ".") \
                  .replace("{{role}}", role) \
                  .replace("{{domain}}", domain) \
                  .replace("{{former_role}}", ROLES[(index + 3) % len(ROLES)]) \
                  .replace("{{former_company}}", FORMER_COMPANIES[index % len(FORMER_COMPANIES)]) \
                  .replace("{{my_strength}}", skills[0] if skills else "execution") \
                  .replace("{{looking_role}}", ROLES[(index + 7) % len(ROLES)]) \
                  .replace("{{skill1}}", skills[0] if len(skills) > 0 else "building") \
                  .replace("{{skill2}}", skills[1] if len(skills) > 1 else "growth") \
                  .replace("{{obsession}}", domain.lower()) \
                  .replace("{{years}}", str(random.randint(3, 15))) \
                  .replace("{{achievement}}", ["Series A", "IPO", "$10M ARR", "Y Combinator alumni", "acquired", "100K users"][index % 6]) \
                  .replace("{{product}}", idea["title"]) \
                  .replace("{{metric}}", ["1M users", "$5M ARR", "4.8 rating", "Y Combinator", "Series B"][index % 5]) \
                  .replace("{{topic}}", f"{domain} optimization") \
                  .replace("{{problem}}", f"{domain.lower()} inefficiency") \
                  .replace("{{former_project}}", idea["title"] + " prototype") \
                  .replace("{{revenue}}", str(random.randint(5, 50))) \
                  .replace("{{field}}", domain) \
                  .replace("{{degree}}", ["PhD", "MSc", "MBA", "BSc"][index % 4]) \
                  .replace("{{university}}", UNIVERSITIES[index % len(UNIVERSITIES)]) \
                  .replace("{{project}}", idea["title"].lower().replace(" ", "-")) \
                  .replace("{{stars}}", str(random.randint(500, 15000)))

    looking_for = random.sample(LOOKING_FOR_OPTIONS, min(random.randint(2, 4), len(LOOKING_FOR_OPTIONS)))
    not_looking_for = random.sample(NOT_LOOKING_FOR_OPTIONS, min(random.randint(2, 3), len(NOT_LOOKING_FOR_OPTIONS)))

    # Эмоциональные черты — НЕЗАВИСИМЫЕ от OCEAN, дают независимый сигнал в behavioral.
    emotions = {
        "empathy": random.randint(20, 90),
        "anger":   random.randint(10, 80),
        "cunning": random.randint(10, 80),
        "lying":   random.randint(10, 70),
        "honesty": random.randint(30, 95),
    }

    return {
        "index": index,
        "name": name,
        "email": f"agent{index:03d}@syndi.demo",
        "password": f"AgentDemo{index:03d}!",
        "role": role,
        "domain": domain,
        "location": location,
        "stage": stage,
        "bio": bio,
        "skills": skills,
        "big_five": big_five,
        "archetype": archetype[0],
        "startup": idea,
        "looking_for": looking_for,
        "not_looking_for": not_looking_for,
        "can_teach": random.sample(skills, min(3, len(skills))),
        "want_to_learn": random.sample([s for s in ALL_SKILLS if s not in skills], min(3, len(ALL_SKILLS) - len(skills))),
        "goals": {
            "timeline": TIMELINES[index % len(TIMELINES)],
            "commitment": COMMITMENTS[index % len(COMMITMENTS)],
            "seeking": random.sample(SEEKING_TYPES, min(2, len(SEEKING_TYPES))),
        },
        "autonomy_level": random.randint(1, 5),
        "emotions": emotions,
    }


def generate_all(count: int = 100) -> list[dict]:
    """Генерирует N уникальных founder-профилей."""
    return [make_founder(i) for i in range(count)]


if __name__ == "__main__":
    import json
    founders = generate_all(100)
    print(json.dumps(founders[0], indent=2, ensure_ascii=False))
    print(f"\n...Generated {len(founders)} profiles")
