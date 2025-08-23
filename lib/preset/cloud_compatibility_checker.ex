defmodule CKEditor5.Preset.CloudCompatibilityChecker do
  @moduledoc """
  Enforces business rules and compatibility constraints for CKEditor5 presets.
  Specifically handles Cloud Distribution Channel licensing requirements and configuration validation.
  """

  import CKEditor5.License.Assertions, only: [compatible_cloud_distribution?: 1]
  import CKEditor5.Preset, only: [configured_cloud?: 1]

  alias CKEditor5.{Cloud, Errors, Preset}

  @doc """
  Checks if the preset's Cloud configuration is valid based on the license type.
  """
  def assign_default_cloud_config(%Preset{cloud: _cloud, license: license} = preset) do
    cond do
      compatible_cloud_distribution?(license) and !configured_cloud?(preset) ->
        {:ok, %{preset | cloud: %Cloud{}}}

      !compatible_cloud_distribution?(license) and configured_cloud?(preset) ->
        {:error, %Errors.CloudCannotBeUsedWithLicenseKey{preset: preset, license: license}}

      true ->
        {:ok, preset}
    end
  end

  @doc """
  Safe version of `ensure_cloud_configured!/1` which returns `:ok` when the
  preset is valid for cloud distribution or `{:error, error_struct}` when not.
  """
  def ensure_cloud_configured(%Preset{} = preset) do
    cond do
      !compatible_cloud_distribution?(preset.license) ->
        {:error, %Errors.CloudCannotBeUsedWithLicenseKey{preset: preset, license: preset.license}}

      !configured_cloud?(preset) ->
        {:error, %Errors.CloudNotConfigured{preset: preset}}

      true ->
        :ok
    end
  end

  @doc """
  Bang version kept for backwards compatibility. It delegates to
  `ensure_cloud_configured/1` and raises the returned error struct when
  validation fails.
  """
  def ensure_cloud_configured!(%Preset{} = preset) do
    case ensure_cloud_configured(preset) do
      :ok -> :ok
      {:error, err} -> raise err
    end
  end
end
