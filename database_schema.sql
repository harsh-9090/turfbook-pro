--
-- PostgreSQL database dump
--

\restrict PhjfgdSJ71DbeZlKx3BVVmJcQUbc3cZJVxYxzHe2ZJQEgDnGFwosoXNNTbijcSw

-- Dumped from database version 17.8 (130b160)
-- Dumped by pg_dump version 17.9 (Ubuntu 17.9-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: generate_daily_slots(date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_daily_slots(target_date date, target_turf_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  tmpl RECORD;
  t_count INT;
  table_idx INT;
  target_dow INT;
BEGIN
  -- Get active table count
  SELECT COALESCE(table_count, 1) INTO t_count 
  FROM turfs WHERE id = target_turf_id;

  target_dow := EXTRACT(DOW FROM target_date);

  -- Loop through every slot template defined for this day of the week
  FOR tmpl IN 
    SELECT start_time, end_time, price 
    FROM slot_templates 
    WHERE turf_id = target_turf_id AND day_of_week = target_dow
  LOOP
    -- Loop through tables (if any)
    FOR table_idx IN 1..t_count LOOP
      INSERT INTO slots (turf_id, date, start_time, end_time, price, table_number)
      VALUES (target_turf_id, target_date, tmpl.start_time, tmpl.end_time, tmpl.price, table_idx)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;


--
-- Name: trigger_generate_templates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_generate_templates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  dow INT;
  hour_val INT;
  calc_price DECIMAL(10,2);
BEGIN
  FOR dow IN 0..6 LOOP
    FOR hour_val IN 6..22 LOOP
      IF dow IN (0, 6) THEN
        IF hour_val >= 18 THEN calc_price := NEW.weekend_night_price;
        ELSE calc_price := NEW.weekend_day_price; END IF;
      ELSE
        IF hour_val >= 18 THEN calc_price := NEW.weekday_night_price;
        ELSE calc_price := NEW.weekday_day_price; END IF;
      END IF;
      
      INSERT INTO slot_templates (turf_id, day_of_week, start_time, end_time, price)
      VALUES (
        NEW.id, 
        dow, 
        make_time(hour_val, 0, 0), 
        make_time(hour_val + 1, 0, 0), 
        calc_price
      );
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid,
    action character varying(255) NOT NULL,
    details text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    slot_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    razorpay_order_id character varying(255),
    paid_amount numeric(10,2) DEFAULT 0,
    remaining_amount numeric(10,2) DEFAULT 0,
    payment_mode character varying(20),
    CONSTRAINT bookings_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('paid'::character varying)::text, ('refunded'::character varying)::text]))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: gallery_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cloudinary_url text NOT NULL,
    public_id text NOT NULL,
    alt_text text,
    span_type text DEFAULT 'default'::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    method character varying(50) DEFAULT 'online'::character varying,
    razorpay_order_id character varying(255),
    razorpay_payment_id character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pricing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    subtitle character varying(200),
    price character varying(50) NOT NULL,
    unit character varying(20) DEFAULT '/hour'::character varying,
    features text[] DEFAULT '{}'::text[],
    popular boolean DEFAULT false,
    facility character varying(50),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer DEFAULT 1 NOT NULL,
    address text DEFAULT '123 Sports Complex, Green Park, Mumbai 400001'::text,
    phone character varying(20) DEFAULT '+91 98765 43210'::character varying,
    email character varying(255) DEFAULT 'hello@akolasportsarena.com'::character varying,
    working_hours character varying(255) DEFAULT 'Mon–Sun: 6:00 AM – 12:00 AM'::character varying,
    facebook_url text DEFAULT ''::text,
    instagram_url text DEFAULT ''::text,
    twitter_url text DEFAULT ''::text,
    updated_at timestamp without time zone DEFAULT now(),
    map_embed_url text DEFAULT ''::text
);


--
-- Name: slot_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slot_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    turf_id uuid,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    price numeric(10,2) DEFAULT 800.00 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT slot_templates_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    turf_id uuid,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    price numeric(10,2) DEFAULT 800.00 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    table_number integer DEFAULT 1
);


--
-- Name: table_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    turf_id uuid,
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    status character varying(20) DEFAULT 'running'::character varying,
    total_amount numeric(10,2),
    name character varying(50) DEFAULT 'Table'::character varying,
    customer_name character varying(100),
    customer_phone character varying(20),
    table_number integer,
    payment_mode character varying(20) DEFAULT 'cash'::character varying,
    CONSTRAINT table_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('running'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(100),
    text text NOT NULL,
    rating integer DEFAULT 5,
    image_url text,
    public_id text,
    status character varying(20) DEFAULT 'pending'::character varying,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    image_urls text[] DEFAULT '{}'::text[],
    public_ids text[] DEFAULT '{}'::text[]
);


--
-- Name: tournament_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_registrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tournament_id uuid,
    team_name character varying(255) NOT NULL,
    captain_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    razorpay_order_id text,
    razorpay_payment_id text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    sport_type character varying(50) DEFAULT 'football'::character varying,
    description text,
    rules text,
    entry_fee numeric(10,2) DEFAULT 0.00,
    prize text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    max_teams integer DEFAULT 16,
    banner_image text,
    is_featured boolean DEFAULT false,
    show_on_homepage boolean DEFAULT false,
    display_priority integer DEFAULT 0,
    display_start_date timestamp without time zone,
    display_end_date timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: turfs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turfs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    facility_type character varying(50) DEFAULT 'cricket'::character varying,
    location text,
    description text,
    image_url text,
    created_at timestamp without time zone DEFAULT now(),
    weekday_day_price numeric(10,2) DEFAULT 800.00,
    weekday_night_price numeric(10,2) DEFAULT 1200.00,
    weekend_day_price numeric(10,2) DEFAULT 1200.00,
    weekend_night_price numeric(10,2) DEFAULT 1500.00,
    table_count integer DEFAULT 1,
    opening_hour integer DEFAULT 6,
    closing_hour integer DEFAULT 23,
    min_booking_amount numeric(10,2) DEFAULT 0
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20) NOT NULL,
    password_hash character varying(255),
    role character varying(20) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    pin_hash character varying(255),
    token_version integer DEFAULT 1,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('admin'::character varying)::text])))
);


--
-- Name: whatsapp_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone character varying(20) NOT NULL,
    template_name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    response jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT whatsapp_logs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'delivered'::character varying, 'read'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: gallery_images gallery_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_images
    ADD CONSTRAINT gallery_images_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pricing_plans pricing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_plans
    ADD CONSTRAINT pricing_plans_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: slot_templates slot_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_pkey PRIMARY KEY (id);


--
-- Name: slot_templates slot_templates_unique_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_unique_slot UNIQUE (turf_id, day_of_week, start_time);


--
-- Name: slots slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_pkey PRIMARY KEY (id);


--
-- Name: slots slots_turf_id_date_start_time_table_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_turf_id_date_start_time_table_key UNIQUE (turf_id, date, start_time, table_number);


--
-- Name: table_sessions table_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: tournament_registrations tournament_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_pkey PRIMARY KEY (id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: turfs turfs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turfs
    ADD CONSTRAINT turfs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_logs whatsapp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_bookings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_created_at ON public.bookings USING btree (created_at DESC);


--
-- Name: idx_bookings_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot ON public.bookings USING btree (slot_id);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);


--
-- Name: idx_payments_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking ON public.payments USING btree (booking_id);


--
-- Name: idx_sessions_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_start_time ON public.table_sessions USING btree (start_time);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_status ON public.table_sessions USING btree (status);


--
-- Name: idx_sessions_turf_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_turf_id ON public.table_sessions USING btree (turf_id);


--
-- Name: idx_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_date ON public.slots USING btree (date);


--
-- Name: idx_slots_is_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_is_available ON public.slots USING btree (is_available);


--
-- Name: idx_slots_turf_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_turf_date ON public.slots USING btree (turf_id, date);


--
-- Name: idx_testimonials_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_testimonials_status ON public.testimonials USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: turfs after_turf_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_turf_insert AFTER INSERT ON public.turfs FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_templates();


--
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: slot_templates slot_templates_turf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_turf_id_fkey FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;


--
-- Name: slots slots_turf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_turf_id_fkey FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;


--
-- Name: table_sessions table_sessions_turf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_turf_id_fkey FOREIGN KEY (turf_id) REFERENCES public.turfs(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict PhjfgdSJ71DbeZlKx3BVVmJcQUbc3cZJVxYxzHe2ZJQEgDnGFwosoXNNTbijcSw

