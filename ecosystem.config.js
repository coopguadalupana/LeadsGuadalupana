module.exports = {
  apps: [
    {
      name: "leadsGuadalupana",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3007,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
    },
    {
      name: "leadsGuadalupana-agencia",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3008,
        NEXT_BASE_PATH: "/agencia",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/error-agencia.log",
      out_file: "./logs/out-agencia.log",
      merge_logs: true,
    },
  ],
};
