defmodule Mix.Tasks.Ckeditor5.Install do
  @moduledoc """
  Installs CKEditor 5 packages.

  Usage:
      mix ckeditor5.install [OPTIONS]

  Options:
      --premium             Install CKEditor 5 Premium Features.
      --version <version>   Specify the version to install. If not provided, installs the latest version.
      --help                Show this help message.
  """

  use Mix.Task

  @impl true
  def run(args) do
    {opts, _, _} =
      OptionParser.parse(args, switches: [premium: :boolean, version: :string, help: :boolean])

    if opts[:help] do
      IO.puts(@moduledoc)
    else
      CKEditor5.Installer.install(opts)
    end
  end
end
