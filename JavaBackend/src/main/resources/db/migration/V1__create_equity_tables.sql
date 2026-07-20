CREATE TABLE companies (
    id VARCHAR(64) PRIMARY KEY,
    short_name VARCHAR(128) NOT NULL,
    listing_code VARCHAR(64) NOT NULL UNIQUE,
    listing_status VARCHAR(32) NOT NULL,
    industry VARCHAR(64) NOT NULL,
    region VARCHAR(64) NOT NULL,
    company_level VARCHAR(32) NOT NULL,
    latest_disclosure_date DATE NOT NULL
);

CREATE TABLE projects (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(128) NOT NULL,
    title VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    industry VARCHAR(64) NOT NULL,
    region VARCHAR(64) NOT NULL,
    financing_amount DECIMAL(12, 2) NOT NULL,
    financing_unit VARCHAR(16) NOT NULL,
    intent_count INT NULL,
    next_roadshow_at VARCHAR(32) NULL
);

CREATE TABLE project_tags (
    project_id VARCHAR(64) NOT NULL,
    tag_order INT NOT NULL,
    tag VARCHAR(32) NOT NULL,
    PRIMARY KEY (project_id, tag_order),
    CONSTRAINT fk_project_tags_project FOREIGN KEY (project_id) REFERENCES projects (id)
);

INSERT INTO companies (id, short_name, listing_code, listing_status, industry, region, company_level, latest_disclosure_date) VALUES
    ('company-128', '智造新材', 'Q000128', '已挂牌', '先进制造', '杭州', '创新层', '2026-05-20'),
    ('company-116', '云链科技', 'Q000116', '已挂牌', '企业服务', '宁波', '培育层', '2026-05-18'),
    ('company-098', '绿源生物', 'Q000098', '已挂牌', '生物医药', '绍兴', '展示层', '2026-05-16'),
    ('company-087', '数智云科', 'Q000087', '已挂牌', '数字经济', '杭州', '创新层', '2026-05-12'),
    ('company-076', '清能动力', 'Q000076', '已挂牌', '绿色能源', '嘉兴', '培育层', '2026-05-09');

INSERT INTO projects (id, company_name, title, status, industry, region, financing_amount, financing_unit, intent_count, next_roadshow_at) VALUES
    ('project-001', '智造新材', '智造新材 A轮融资', 'FUNDRAISING', '先进制造', '杭州', 3000.00, '万元', 12, NULL),
    ('project-002', '云链科技', '云链科技股权融资', 'ROADSHOW', '企业服务', '宁波', 1800.00, '万元', NULL, '2026-05-28 14:00'),
    ('project-003', '绿源生物', '绿源生物战略融资', 'FUNDRAISING', '生物医药', '绍兴', 5000.00, '万元', 8, NULL),
    ('project-004', '数智云科', '数智云科天使轮融资', 'ENDED', '数字经济', '杭州', 1200.00, '万元', 15, NULL),
    ('project-005', '清能动力', '清能动力产业融资', 'ROADSHOW', '绿色能源', '嘉兴', 4200.00, '万元', NULL, '2026-06-02 10:00');

INSERT INTO project_tags (project_id, tag_order, tag) VALUES
    ('project-001', 0, '已认证'),
    ('project-001', 1, '材料已披露'),
    ('project-002', 0, '材料已披露'),
    ('project-003', 0, '专精特新'),
    ('project-003', 1, '已认证'),
    ('project-004', 0, '材料已披露'),
    ('project-005', 0, '已认证');
