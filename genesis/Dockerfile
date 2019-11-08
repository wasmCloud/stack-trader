FROM rust:1.39.0 as build
WORKDIR /wrk

COPY ./ ./
RUN cargo build --release

FROM frolvlad/alpine-glibc
COPY --from=build /wrk/target/release/genesis /genesis
CMD ["sh"]