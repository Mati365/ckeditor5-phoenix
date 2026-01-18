{:ok, _} = Application.ensure_all_started(:wallaby)
Playground.App.run_supervisor()
Application.put_env(:wallaby, :base_url, Playground.Endpoint.url())

ExUnit.start(trace: true, exclude: [:e2e])
