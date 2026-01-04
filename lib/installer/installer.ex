defmodule CKEditor5.Installer do
  @moduledoc """
  Module responsible for downloading CKEditor 5 NPM packages into deps folder.
  """

  alias CKEditor5.Installer.NPMRegistry

  @doc """
  Installs CKEditor 5 packages.
  ## Options

    * `:premium` - If true, installs CKEditor 5 Premium Features package as well.
    * `:version` - Specifies the version to install. If not provided, installs the latest version.

  """
  def install(opts \\ []) do
    packages = ["ckeditor5"]

    packages =
      if Keyword.get(opts, :premium, false) do
        packages ++ ["ckeditor5-premium-features"]
      else
        packages
      end

    packages
    |> Enum.map(fn package ->
      Task.async(fn -> install_package(package, opts) end)
    end)
    |> Enum.each(&Task.await(&1, :infinity))
  end

  defp install_package(package_name, opts) do
    case get_version(opts, package_name) do
      {:ok, version} ->
        NPMRegistry.install_package(
          package_name,
          version,
          "deps/#{package_name}",
          &modify_package/1
        )

      {:error, reason} ->
        IO.puts("Failed to get version of #{package_name}: #{reason}")
    end
  end

  defp get_version(opts, package_name) do
    if version = Keyword.get(opts, :version) do
      {:ok, version}
    else
      NPMRegistry.get_latest_version(package_name)
    end
  end

  defp modify_package(path) do
    browser_dist = Path.join(path, "dist/browser")
    dist = Path.join(path, "dist")

    if File.exists?(browser_dist) do
      File.ls!(browser_dist)
      |> Enum.filter(fn file ->
        String.ends_with?(file, ".js") or String.ends_with?(file, ".css")
      end)
      |> Enum.each(fn file ->
        File.cp!(Path.join(browser_dist, file), Path.join(dist, file))
      end)
    end
  end
end
