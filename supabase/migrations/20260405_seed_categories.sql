-- ============================================
-- Seed forum categories
-- Matches src/lib/forum/categories.ts
-- ============================================

INSERT INTO forum_categories (slug, name, description, section, feed, display_order) VALUES
-- GENERAL DISCUSSION (commons)
('beginners',       'Beginners & Help',       'New to the forum? Start here.',                'general',   'commons',  1),
('key-concepts',    '4 Key Concepts',         'Core concepts and fundamental principles.',    'general',   'commons',  2),
('web3-outpost',    'Web3 Outpost',           'Web3 integration, badges, and specs.',         'general',   'commons',  3),
('dao-governance',  'DAO Governance',         'Governance discussions and proposals.',         'general',   'commons',  4),

-- FUNCTIONS / VALUE SYSTEM (research)
('game-theory',     'Economic Game Theory',   'Economic models and game theory.',              'functions', 'research', 9),
('function-ideas',  'Function Ideas',         'Propose and discuss new functions.',             'functions', 'research', 10),
('hunting',         'Hunting',                'Resource discovery strategies.',                 'functions', 'research', 11),
('property',        'Property',               'Property rights and ownership.',                 'functions', 'research', 12),
('parenting',       'Parenting',              'Community growth and mentorship.',               'functions', 'research', 13),
('governance-func', 'Governance',             'Decision-making structures.',                    'functions', 'research', 14),
('organizations',   'Organizations',          'Organizational design.',                         'functions', 'research', 15),
('curation',        'Curation',               'Content and quality curation.',                  'functions', 'research', 16),
('farming',         'Farming',                'Value creation strategies.',                     'functions', 'research', 17),
('portal',          'Portal',                 'Gateway and integration.',                       'functions', 'research', 18),
('communication',   'Communication',          'Communication protocols.',                       'functions', 'research', 19),

-- TECHNICAL SECTION (research)
('architecture',    'General Architecture',   'System architecture and design.',                'technical', 'research', 20),
('state-machine',   'State Machine',          'State transitions and logic.',                   'technical', 'research', 21),
('consensus',       'Consensus (Proof of Hunt)','Consensus mechanisms.',                        'technical', 'research', 22),
('cryptography',    'Cryptography',           'Cryptographic primitives.',                      'technical', 'research', 23),
('account-system',  'Account System',         'Accounts and identity.',                         'technical', 'research', 24),
('security',        'Security',               'Security protocols.',                             'technical', 'research', 25),

-- PARTNER COMMUNITIES (commons)
('partners-general','General Discussion',     'Partner community discussions.',                'partners',  'commons',  5),
('announcements',   'Announcements',          'Official partner news and updates.',            'partners',  'commons',  6),
('network-states',  'Network States',         'Current and upcoming network states.',          'partners',  'commons',  7),
('partner-badges',  'Partner Badges & SPEC',  'Badge systems for partners.',                   'partners',  'commons',  8),

-- OTHERS (commons)
('meta',            'Meta-discussion',        'About the forum itself.',                        'others',    'commons',  26),
('politics',        'Politics & Society',     'Political impacts on society.',                  'others',    'commons',  27),
('economics',       'Economics',              'Economic models and theories.',                  'others',    'commons',  28),
('crypto-web3',     'Cryptocurrencies & Web3','The broader crypto landscape.',                  'others',    'commons',  29),
('off-topic',       'Off-topic',              'Anything unrelated to the protocol.',            'others',    'commons',  30);
