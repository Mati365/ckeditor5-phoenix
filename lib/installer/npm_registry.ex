defmodule CKEditor5.Installer.NPMRegistry do
  @moduledoc """
  Module responsible for interacting with the NPM registry. It fetches and extracts NPM packages to certain locations.
  """

  require Logger

  @registry "https://registry.npmjs.org/"

  @doc """
  Downloads and unpacks an NPM package from the registry.

  ## Arguments

    * `package_name` - The name of the NPM package.
    * `version` - The version of the package to install.
    * `destination` - The destination directory where the package should be installed (e.g., "deps/my_package").
    * `callback` - A function that takes the path to the extracted package (in tmp) and allows modification before moving to destination.

  """
  def install_package(package_name, version, destination, callback \\ fn _ -> :ok end) do
    ensure_deps_started()

    tmp_dir = System.tmp_dir!()
    tarball_filename = "#{package_name}-#{version}.tgz"
    tarball_path = Path.join(tmp_dir, tarball_filename)
    extract_path = Path.join(tmp_dir, "#{package_name}-#{version}-extracted")

    try do
      # 1. Fetch metadata
      metadata_url = "#{@registry}#{package_name}/#{version}"
      Logger.info("Fetching metadata from #{metadata_url}")

      {:ok, metadata} = fetch_json(metadata_url)
      tarball_url = get_in(metadata, ["dist", "tarball"])

      if is_nil(tarball_url) do
        raise "Could not find tarball URL for #{package_name} v#{version}"
      end

      # 2. Download tarball
      Logger.info("Downloading #{package_name} v#{version}...")
      :ok = download_file(tarball_url, tarball_path)

      # 3. Extract tarball
      File.mkdir_p!(extract_path)
      :ok = extract_tarball(tarball_path, extract_path)

      # NPM packages usually extract into a "package" folder
      package_root = Path.join(extract_path, "package")

      working_path =
        if File.exists?(package_root) do
          package_root
        else
          extract_path
        end

      # 4. Run modification callback
      callback.(working_path)

      # 5. Move to destination
      # Ensure parent of destination exists
      File.mkdir_p!(Path.dirname(destination))

      # Remove destination if it exists to ensure clean install
      File.rm_rf!(destination)

      File.cp_r!(working_path, destination)
      Logger.info("Installed #{package_name} to #{destination}")
    after
      File.rm(tarball_path)
      File.rm_rf(extract_path)
    end
  end

  defp ensure_deps_started do
    :inets.start()
    :ssl.start()
  end

  defp fetch_json(url) do
    case :httpc.request(:get, {String.to_charlist(url), []}, http_options(), body_format: :binary) do
      {:ok, {{_, 200, _}, _, body}} -> Jason.decode(body)
      {:ok, {{_, status, _}, _, _}} -> {:error, "HTTP request failed with status #{status}"}
      {:error, reason} -> {:error, reason}
    end
  end

  defp download_file(url, path) do
    case :httpc.request(:get, {String.to_charlist(url), []}, http_options(),
           stream: String.to_charlist(path)
         ) do
      {:ok, :saved_to_file} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp http_options do
    [
      ssl: [
        verify: :verify_peer,
        cacertfile: CAStore.file_path(),
        depth: 3,
        customize_hostname_check: [
          match_fun: :public_key.pkix_verify_hostname_match_fun(:https)
        ]
      ]
    ]
  end

  defp extract_tarball(tarball_path, dest_dir) do
    :erl_tar.extract(String.to_charlist(tarball_path), [
      :compressed,
      {:cwd, String.to_charlist(dest_dir)}
    ])
  end
end
