defmodule CKEditor5.MixProject do
  use Mix.Project

  @version "1.16.0"
  @source_url "https://github.com/Mati365/ckeditor5-phoenix"
  @default_cke_version "47.3.0"

  def project do
    [
      app: :ckeditor5_phoenix,
      description: "CKEditor 5 integration for Phoenix Framework",
      version: @version,
      cke: %{
        default_editor_version: @default_cke_version
      },
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      docs: docs(),
      package: package(),
      aliases: aliases(),
      dialyzer: dialyzer(),
      test_coverage: [tool: ExCoveralls]
    ]
  end

  def application do
    [
      extra_applications: extra_apps(Mix.env())
    ]
  end

  def cli do
    [
      preferred_envs: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.html": :test,
        "coveralls.github": :test,
        "coveralls.cobertura": :test,
        "test.watch": :test
      ]
    ]
  end

  defp extra_apps(:dev), do: [:logger, :dotenv]
  defp extra_apps(_), do: []

  defp deps do
    is_dev = Mix.env() == :dev

    [
      {:castore, ">= 0.0.0"},
      {:phoenix, "~> 1.7"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_view, "~> 2.0", only: [:dev]},
      {:phoenix_live_view, "~> 1.0"},
      {:norm, "~> 0.13"},
      {:memoize, "~> 1.4"},
      {:jason, "~> 1.4"},
      {:dotenv, "~> 3.0.0", only: [:dev]},
      {:telemetry_metrics, "~> 1.0", only: [:dev]},
      {:telemetry_poller, "~> 1.0", only: [:dev]},
      {:phoenix_live_reload, "~> 1.6", only: [:dev]},
      {:dns_cluster, "~> 0.1.1", only: [:dev]},
      {:bandit, "~> 1.5", only: [:dev]},
      {:tailwind, "~> 0.3", only: [:dev], runtime: is_dev},
      {:esbuild, "~> 0.7", only: [:dev], runtime: is_dev},
      {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:ex_doc, ">= 0.38.2", only: [:prod, :dev], runtime: false},
      {:excoveralls, "~> 0.18", only: :test},
      {:mix_test_watch, "~> 1.0", only: [:dev, :test], runtime: false}
    ]
  end

  defp package do
    [
      maintainers: ["Mateusz Bagiński"],
      licenses: ["MIT"],
      files: [
        # Core elixir package
        "lib",
        "mix.exs",
        ".formatter.exs",
        ".credo.exs",
        "README.md",
        "CHANGELOG.md",
        "LICENSE",

        # NPM package
        "package.json",
        "dist"
      ],
      links: %{
        "GitHub" => @source_url
      }
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(:dev), do: ["lib", "playground"]
  defp elixirc_paths(_), do: ["lib"]

  defp aliases do
    [
      playground: "run -e 'Playground.App.run()'",
      "assets.test": ["cmd npm run npm_package:test"],
      "assets.typecheck": ["cmd npm run typecheck"],
      "assets.setup": [
        "tailwind.install --if-missing",
        "esbuild.install --if-missing"
      ],
      "assets.build": [
        "cmd npm run npm_package:build",
        "tailwind ckeditor --minify",
        "esbuild ckeditor --minify"
      ],
      "prepare.publish": [
        "cmd npm run npm_package:build",
        "cmd cp -r npm_package/dist .",
        "cmd cp npm_package/package.json ."
      ],
      "assets.deploy": [
        "assets.setup",
        "assets.build",
        "phx.digest playground/priv/static"
      ],
      "assets.lint": ["cmd npx eslint"]
    ]
  end

  defp dialyzer do
    [
      plt_file: {:no_warn, "priv/plts/project.plt"},
      plt_add_apps: [:mix],
      ignore_warnings: ".dialyzer_ignore.exs"
    ]
  end

  defp docs do
    [
      main: "readme",
      name: "CKEditor 5",
      source_ref: "v#{@version}",
      canonical: "http://hexdocs.pm/ckeditor5",
      source_url: @source_url,
      extras: ["README.md", "LICENSE"]
    ]
  end
end
