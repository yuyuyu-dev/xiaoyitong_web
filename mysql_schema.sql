-- ============================================================
-- 校易通 · MySQL 数据库初始化脚本
-- 适用于基于 MySQL 的后端存储，表结构已优化为 MySQL 兼容类型
-- ============================================================

-- 1. 用户表（含档案信息）
create table if not exists users (
  id          char(36)       not null primary key,
  email       varchar(320)   not null unique,
  password_hash varchar(255) not null,
  nickname    varchar(100)   not null,
  school      varchar(100)   not null default '',
  bio         varchar(1000)  not null default '',
  avatar_url  varchar(500)   not null default '',
  last_read_at datetime(6)   null default null,
  is_admin    tinyint(1)     not null default 0,
  created_at  datetime(6)    not null default current_timestamp(6)
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_users_created_at on users(created_at);

-- 2. 商品表
create table if not exists goods (
  id          char(36)       not null primary key,
  seller_id   char(36)       not null,
  title       varchar(200)   not null,
  price       decimal(10,2)  not null,
  category    varchar(80)    not null,
  `condition` varchar(80)    not null,
  location    varchar(150)   not null,
  description varchar(5000)  not null,
  image_url   varchar(500)   not null,
  hot         int            not null default 0,
  status      varchar(20)    not null default 'available',
  created_at  datetime(6)    not null default current_timestamp(6),
  constraint fk_goods_seller foreign key (seller_id) references users(id) on delete cascade
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_goods_created_at on goods(created_at);
create index idx_goods_seller_id on goods(seller_id);
create index idx_goods_category on goods(category);
create index idx_goods_condition on goods(`condition`);

-- 3. 收藏表
create table if not exists favorites (
  id          char(36)       not null primary key,
  user_id     char(36)       not null,
  goods_id    char(36)       not null,
  created_at  datetime(6)    not null default current_timestamp(6),
  unique key uk_favorites_user_goods (user_id, goods_id),
  constraint fk_favorites_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_favorites_goods foreign key (goods_id) references goods(id) on delete cascade
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_favorites_user_id on favorites(user_id);
create index idx_favorites_goods_id on favorites(goods_id);

-- 4. 注册验证码表（用于邮箱验证码注册流程）
create table if not exists register_codes (
  id           char(36)     not null primary key,
  email        varchar(320) not null,
  code         varchar(8)   not null,
  password_hash varchar(255) not null,
  nickname     varchar(100) not null,
  school       varchar(100) not null,
  created_at   datetime(6)  not null default current_timestamp(6),
  expires_at   datetime(6)  not null
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_register_codes_email on register_codes(email);

-- 5. 私信表
create table if not exists messages (
  id          char(36)       not null primary key,
  from_id     char(36)       not null,
  to_id       char(36)       not null,
  content     varchar(5000)  not null,
  created_at  datetime(6)    not null default current_timestamp(6),
  constraint fk_messages_from foreign key (from_id) references users(id) on delete cascade,
  constraint fk_messages_to foreign key (to_id) references users(id) on delete cascade
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_messages_to_created_at on messages(to_id, created_at);
create index idx_messages_from_created_at on messages(from_id, created_at);
create index idx_messages_conversation on messages(from_id, to_id, created_at);

-- 6. 交易记录表
create table if not exists transactions (
  id          char(36)       not null primary key,
  goods_id    char(36)       not null,
  buyer_id    char(36)       not null,
  seller_id   char(36)       not null,
  price       decimal(10,2)  not null,
  status      varchar(20)    not null default 'completed',
  created_at  datetime(6)    not null default current_timestamp(6),
  unique key uk_tx_goods (goods_id),
  constraint fk_tx_goods  foreign key (goods_id)  references goods(id)  on delete cascade,
  constraint fk_tx_buyer  foreign key (buyer_id)  references users(id) on delete cascade,
  constraint fk_tx_seller foreign key (seller_id) references users(id) on delete cascade
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_unicode_ci;

create index idx_tx_buyer  on transactions(buyer_id);
create index idx_tx_seller on transactions(seller_id);
