--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action character varying(64) NOT NULL,
    subject_type character varying(64) NOT NULL,
    subject_id character varying(64) NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO rjain;

--
-- Name: contest_participants; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.contest_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_entry_fee boolean DEFAULT false NOT NULL,
    starting_balance_cents integer NOT NULL,
    current_cash_cents integer NOT NULL,
    last_value_cents integer DEFAULT 0 NOT NULL,
    rank integer
);


ALTER TABLE public.contest_participants OWNER TO rjain;

--
-- Name: contest_results; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.contest_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    user_id uuid NOT NULL,
    raw_result jsonb NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    error_margin double precision,
    extra jsonb,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    rank integer
);


ALTER TABLE public.contest_results OWNER TO rjain;

--
-- Name: contests; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.contests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(80) NOT NULL,
    name character varying(140) NOT NULL,
    description text,
    visibility character varying(16) DEFAULT 'public'::character varying NOT NULL,
    entry_fee_cents integer DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    initial_balance_cents integer NOT NULL,
    max_participants integer,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    created_by_user_id uuid NOT NULL,
    allowed_symbols jsonb,
    trading_constraints jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contest_type text,
    rule_config jsonb
);


ALTER TABLE public.contests OWNER TO rjain;

--
-- Name: leaderboard_snapshots; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.leaderboard_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    as_of timestamp with time zone NOT NULL,
    rankings jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leaderboard_snapshots OWNER TO rjain;

--
-- Name: market_results; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.market_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    symbol text NOT NULL,
    data jsonb NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.market_results OWNER TO rjain;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO rjain;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: rjain
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO rjain;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: rjain
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: participant_predictions; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.participant_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    user_id uuid NOT NULL,
    symbol text NOT NULL,
    prediction jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.participant_predictions OWNER TO rjain;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contest_id uuid NOT NULL,
    type character varying(16) NOT NULL,
    amount_cents integer NOT NULL,
    currency character(3) DEFAULT 'INR'::bpchar NOT NULL,
    status character varying(16) NOT NULL,
    stripe_payment_intent_id character varying(128),
    stripe_charge_id character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO rjain;

--
-- Name: portfolio_results; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.portfolio_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contest_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    as_of timestamp with time zone NOT NULL,
    total_value_cents integer NOT NULL,
    return_percent double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_results OWNER TO rjain;

--
-- Name: portfolio_transactions; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.portfolio_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    symbol character varying(16) NOT NULL,
    quantity_delta numeric(18,4) NOT NULL,
    price_cents integer NOT NULL,
    value_cents integer NOT NULL,
    type character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_transactions OWNER TO rjain;

--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    last_mark_to_market_cents integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolios OWNER TO rjain;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    symbol character varying(16) NOT NULL,
    quantity numeric(18,4) NOT NULL,
    avg_cost_cents integer NOT NULL,
    open_value_cents integer NOT NULL,
    current_value_cents integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.positions OWNER TO rjain;

--
-- Name: price_snapshots; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.price_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol character varying(16) NOT NULL,
    price_cents integer NOT NULL,
    as_of timestamp with time zone NOT NULL,
    source character varying(32) NOT NULL,
    provider_payload jsonb
);


ALTER TABLE public.price_snapshots OWNER TO rjain;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO rjain;

--
-- Name: stock_price_history; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.stock_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    as_of timestamp with time zone NOT NULL,
    ltp double precision NOT NULL,
    volume bigint
);


ALTER TABLE public.stock_price_history OWNER TO rjain;

--
-- Name: stock_symbols; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.stock_symbols (
    symbol character varying(16) NOT NULL,
    name text,
    exchange character varying(16) NOT NULL,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    series character varying(16),
    isin character varying(20),
    lot_size integer,
    face_value numeric(10,2),
    last_seen_at timestamp with time zone,
    metadata jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_symbols OWNER TO rjain;

--
-- Name: trades; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    contest_id uuid NOT NULL,
    user_id uuid NOT NULL,
    symbol character varying(16) NOT NULL,
    side character varying(4) NOT NULL,
    quantity numeric(18,4) NOT NULL,
    price_cents integer NOT NULL,
    notional_cents integer NOT NULL,
    executed_at timestamp with time zone NOT NULL,
    quote_source character varying(32) NOT NULL,
    provider_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trades OWNER TO rjain;

--
-- Name: users; Type: TABLE; Schema: public; Owner: rjain
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    display_name character varying(100),
    avatar_url text,
    role character varying(16) DEFAULT 'user'::character varying NOT NULL,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO rjain;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contest_participants contest_participants_contest_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.contest_participants
    ADD CONSTRAINT contest_participants_contest_id_user_id_key UNIQUE (contest_id, user_id);


--
-- Name: contest_participants contest_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.contest_participants
    ADD CONSTRAINT contest_participants_pkey PRIMARY KEY (id);


--
-- Name: contest_results contest_results_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.contest_results
    ADD CONSTRAINT contest_results_pkey PRIMARY KEY (id);


--
-- Name: contests contests_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.contests
    ADD CONSTRAINT contests_pkey PRIMARY KEY (id);


--
-- Name: contests contests_slug_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.contests
    ADD CONSTRAINT contests_slug_key UNIQUE (slug);


--
-- Name: leaderboard_snapshots leaderboard_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.leaderboard_snapshots
    ADD CONSTRAINT leaderboard_snapshots_pkey PRIMARY KEY (id);


--
-- Name: market_results market_results_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.market_results
    ADD CONSTRAINT market_results_pkey PRIMARY KEY (id);


--
-- Name: participant_predictions participant_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.participant_predictions
    ADD CONSTRAINT participant_predictions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: portfolio_results portfolio_results_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.portfolio_results
    ADD CONSTRAINT portfolio_results_pkey PRIMARY KEY (id);


--
-- Name: portfolio_transactions portfolio_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.portfolio_transactions
    ADD CONSTRAINT portfolio_transactions_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_participant_id_key UNIQUE (participant_id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_portfolio_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_portfolio_id_symbol_key UNIQUE (portfolio_id, symbol);


--
-- Name: price_snapshots price_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.price_snapshots
    ADD CONSTRAINT price_snapshots_pkey PRIMARY KEY (id);


--
-- Name: price_snapshots price_snapshots_symbol_as_of_source_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.price_snapshots
    ADD CONSTRAINT price_snapshots_symbol_as_of_source_key UNIQUE (symbol, as_of, source);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: stock_price_history stock_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.stock_price_history
    ADD CONSTRAINT stock_price_history_pkey PRIMARY KEY (id);


--
-- Name: stock_symbols stock_symbols_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.stock_symbols
    ADD CONSTRAINT stock_symbols_pkey PRIMARY KEY (symbol, exchange);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rjain
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_contest_participants_contest; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_contest_participants_contest ON public.contest_participants USING btree (contest_id);


--
-- Name: idx_contest_results_contest; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_contest_results_contest ON public.contest_results USING btree (contest_id);


--
-- Name: idx_contest_results_user; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_contest_results_user ON public.contest_results USING btree (user_id);


--
-- Name: idx_market_results_contest; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_market_results_contest ON public.market_results USING btree (contest_id);


--
-- Name: idx_market_results_symbol; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_market_results_symbol ON public.market_results USING btree (symbol);


--
-- Name: idx_participant_predictions_contest; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_participant_predictions_contest ON public.participant_predictions USING btree (contest_id);


--
-- Name: idx_participant_predictions_user; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX idx_participant_predictions_user ON public.participant_predictions USING btree (user_id);


--
-- Name: ix_pt_portfolio_created; Type: INDEX; Schema: public; Owner: rjain
--

CREATE INDEX ix_pt_portfolio_created ON public.portfolio_transactions USING btree (portfolio_id, created_at);


--
-- Name: uniq_contest_results_cu; Type: INDEX; Schema: public; Owner: rjain
--

CREATE UNIQUE INDEX uniq_contest_results_cu ON public.contest_results USING btree (contest_id, user_id);


--
-- Name: ux_pr_contest_participant_asof; Type: INDEX; Schema: public; Owner: rjain
--

CREATE UNIQUE INDEX ux_pr_contest_participant_asof ON public.portfolio_results USING btree (contest_id, participant_id, as_of);


--
-- Name: ux_sph_symbol_asof; Type: INDEX; Schema: public; Owner: rjain
--

CREATE UNIQUE INDEX ux_sph_symbol_asof ON public.stock_price_history USING btree (symbol, as_of);


--
-- PostgreSQL database dump complete
--

